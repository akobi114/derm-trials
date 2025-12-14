"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, LogOut, FileText, Activity, 
  CheckCircle2, GraduationCap, HelpCircle,
  MessageSquare, Heart,
  ShieldCheck, Send, Search, ClipboardList, Calendar,
  Stethoscope, MapPin, Archive, Lock, AlertCircle, Check
} from 'lucide-react';
import Link from 'next/link';

// --- TYPES ---
type Application = {
    id: string;
    created_at: string;
    site_status: 'New' | 'Contacted' | 'Scheduled' | 'Enrolled' | 'Not Eligible' | 'Withdrawn' | 'Trial Closed';
    trials: {
        title: string;
        nct_id: string;
        phase: string;
    };
    site_city?: string;
    site_state?: string;
    unread_count?: number;
};

export default function CandidateDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'education'>('home');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null); 
  const mainContentRef = useRef<HTMLElement>(null);     
  const selectedChatIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<string>('home'); // NEW: Tracks tab visibility

  // Sync Refs with State (Critical for Realtime logic)
  useEffect(() => {
      selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
      activeTabRef.current = activeTab;
  }, [activeTab]);

  // --- 1. INITIAL FETCH ---
  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('candidate_profiles').select('*').eq('user_id', user.id).single();
      if (profile) setCandidate(profile);

      const { data: apps } = await supabase
          .from('leads')
          .select(`*, trials (title, nct_id, phase)`)
          .eq('user_id', user.id) 
          .order('created_at', { ascending: false });
          
      if (apps) {
        const appIds = apps.map(a => a.id);
        const { data: unread } = await supabase
            .from('messages')
            .select('lead_id')
            .in('lead_id', appIds)
            .eq('is_read', false)
            .eq('sender_role', 'researcher');

        const formatted = apps.map(app => ({
            ...app,
            unread_count: unread?.filter(m => m.lead_id === app.id).length || 0
        }));
        setApplications(formatted as Application[]);
        
        // Auto-select first active chat if none selected
        if (!selectedChatId && formatted.length > 0) {
            const firstActive = formatted.find((a: any) => !['Not Eligible', 'Withdrawn', 'Trial Closed'].includes(a.site_status));
            if (firstActive) setSelectedChatId(firstActive.id);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // --- 2. STABLE REALTIME LISTENER ---
  useEffect(() => {
      fetchDashboardData();

      const channel = supabase
          .channel('candidate-dashboard-global')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
              setApplications(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
              const incomingMsg = payload.new;
              
              if (incomingMsg.sender_role === 'researcher') {
                  // FIX: Check BOTH if the correct chat is selected AND if we are actually on the messages tab
                  const isChatVisible = (selectedChatIdRef.current === incomingMsg.lead_id) && (activeTabRef.current === 'messages');

                  if (isChatVisible) {
                      // CASE A: Chat is OPEN and VISIBLE
                      setMessages(prev => [...prev, incomingMsg]);
                      supabase.from('messages').update({ is_read: true }).eq('id', incomingMsg.id);
                      setApplications(prev => prev.map(a => a.id === incomingMsg.lead_id ? { ...a, unread_count: 0 } : a));
                  } else {
                      // CASE B: Chat is CLOSED or user is on HOME/EDUCATION tab
                      setApplications(prev => prev.map(a => a.id === incomingMsg.lead_id ? { ...a, unread_count: (a.unread_count || 0) + 1 } : a));
                  }
              }
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardData]); 

  // --- 3. FETCH CHAT MESSAGES ---
  useEffect(() => {
      if (!selectedChatId) return;
      
      async function loadChat() {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('lead_id', selectedChatId)
            .order('created_at', { ascending: true });
            
          setMessages(data || []);
          
          // FIX: Only mark as read if the user is ON the messages tab
          if (activeTab === 'messages') {
              setApplications(prev => prev.map(a => a.id === selectedChatId ? { ...a, unread_count: 0 } : a));
              await supabase.from('messages').update({ is_read: true }).eq('lead_id', selectedChatId).eq('sender_role', 'researcher');
          }
      }
      loadChat();
  }, [selectedChatId, activeTab]); // Re-run when tab changes

  // --- 4. SCROLL LOGIC ---
  useEffect(() => {
    // Scroll Chat to Bottom (with timeout for paint)
    if (chatContainerRef.current) {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 50);
    }
  }, [messages, activeTab, selectedChatId]);

  // Scroll Page to Top when switching tabs/chats
  useEffect(() => {
      if (mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, [activeTab, selectedChatId]);


  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId) return;
    
    const newMsg = {
        id: Date.now(), 
        lead_id: selectedChatId,
        content: messageInput,
        sender_role: 'patient',
        created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
    setMessageInput("");

    await supabase.from('messages').insert({
        lead_id: selectedChatId,
        content: newMsg.content,
        sender_role: 'patient'
    });
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  const activeApps = applications.filter(a => !['Not Eligible', 'Withdrawn', 'Trial Closed'].includes(a.site_status));
  const archivedApps = applications.filter(a => ['Not Eligible', 'Withdrawn', 'Trial Closed'].includes(a.site_status));
  
  const activeChatMessages = messages.filter(m => m.lead_id === selectedChatId);
  const activeApplication = applications.find(a => a.id === selectedChatId);
  const isChatDisabled = ['Not Eligible', 'Withdrawn', 'Trial Closed'].includes(activeApplication?.site_status || '');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row relative">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-20">
        <div className="p-6 h-20 flex items-center border-b border-slate-100">
          <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Activity className="h-5 w-5" /></div>
            <span>Derm<span className="text-indigo-600">Trials</span></span>
          </Link>
        </div>

        <div className="p-4 space-y-1 flex-1">
            <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'home' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Activity className="h-5 w-5" /> My Dashboard</button>
            <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'messages' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <MessageSquare className="h-5 w-5" /> Messages
                {/* SOLID RED BADGE */}
                {applications.reduce((acc, app) => acc + (app.unread_count || 0), 0) > 0 && <span className="ml-auto bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{applications.reduce((acc, app) => acc + (app.unread_count || 0), 0)}</span>}
            </button>
            <button onClick={() => setActiveTab('education')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'education' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><GraduationCap className="h-5 w-5" /> Learning Center</button>
        </div>

        <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">{candidate?.first_name?.[0]}{candidate?.last_name?.[0]}</div>
                <div className="overflow-hidden"><p className="text-sm font-bold text-slate-900 truncate">{candidate?.first_name} {candidate?.last_name}</p><p className="text-xs text-slate-500 truncate">Patient Account</p></div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"><LogOut className="h-3 w-3" /> Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT - WITH REF FOR SCROLL TOP */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-slate-50 relative">
        {activeTab === 'home' && (
            <div className="p-6 md:p-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <header className="mb-10 flex justify-between items-end">
                    <div><h1 className="text-3xl font-extrabold text-slate-900">Hello, {candidate?.first_name}</h1><p className="text-slate-500 mt-2 text-lg">Your health journey starts here.</p></div>
                    <Link href="/" className="hidden md:flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"><Search className="h-4 w-4" /> Browse All Studies</Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Active Applications</h2></div>
                        {activeApps.length > 0 ? activeApps.map((app) => {
                                const isVisitStage = ['Scheduled', 'Enrolled'].includes(app.site_status);
                                return (
                                    <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{app.trials?.nct_id}</span><span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{app.trials?.phase || "Clinical Trial"}</span></div>
                                                <h3 className="font-bold text-lg text-slate-900 leading-snug">{app.trials?.title}</h3>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border whitespace-nowrap ${isVisitStage ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{app.site_status === 'New' ? 'In Review' : app.site_status}</span>
                                        </div>
                                        <div className="relative pt-6 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-400 relative z-10 mb-3"><div className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Applied</div><div className={`flex items-center gap-1 text-emerald-600`}>{isVisitStage ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />} Screening</div><div className={isVisitStage ? 'text-purple-600 flex items-center gap-1' : ''}>{isVisitStage && <Calendar className="h-3 w-3" />} First Visit</div></div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isVisitStage ? 'w-full bg-purple-500' : 'w-2/3 bg-emerald-500'}`}></div></div>
                                        </div>
                                        <div className="mt-6 flex gap-3">
                                            <button onClick={() => { setSelectedChatId(app.id); setActiveTab('messages'); }} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2">
                                                <MessageSquare className="h-3 w-3" /> Message Team 
                                                {app.unread_count ? <span className="bg-red-600 w-2 h-2 rounded-full ml-2"></span> : ''}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white"><h3 className="font-bold text-slate-900 mb-2">No active applications</h3><p className="text-slate-500 text-sm mb-6">Browse our database to find a new study.</p><Link href="/" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg">Browse Trials</Link></div>}

                        {/* ARCHIVED SECTION */}
                        {archivedApps.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Archive className="h-4 w-4" /> Past Applications</h3>
                                <div className="space-y-4">
                                    {archivedApps.map(app => (
                                        <div key={app.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col gap-4 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-between"><div><div className="text-[10px] font-bold text-slate-400 mb-1">{app.trials?.nct_id}</div><h4 className="font-bold text-slate-600 text-sm">{app.trials?.title}</h4></div><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${app.site_status === 'Withdrawn' ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-600'}`}>{app.site_status === 'Withdrawn' ? 'Withdrawn' : app.site_status === 'Trial Closed' ? 'Trial Closed' : 'Not Eligible'}</span></div>
                                            {app.site_status === 'Not Eligible' && <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm text-sm text-slate-600 leading-relaxed flex gap-3"><AlertCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" /><p>Thank you for your interest. You do not meet the specific criteria for this study.</p></div>}
                                            {app.site_status === 'Trial Closed' && <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm text-sm text-slate-600 leading-relaxed flex gap-3"><Lock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" /><p>The research site has stopped accepting applications for this trial.</p></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div><h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Heart className="h-5 w-5 text-pink-400" /> Why Participate?</h3><p className="text-indigo-100 text-sm mb-6 leading-relaxed">Your participation helps develop new treatments that could save lives.</p><button onClick={() => setActiveTab('education')} className="w-full py-2.5 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors">Read Patient Guide</button></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4 text-slate-400" /> FAQ</h3><div className="space-y-4"><div><h4 className="text-xs font-bold text-slate-900 mb-1">Is it safe?</h4><p className="text-xs text-slate-500 leading-relaxed">All trials are reviewed by an Institutional Review Board (IRB) to ensure safety.</p></div></div></div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'messages' && (
            <div className="h-[calc(100vh-5rem)] md:h-screen p-4 md:p-8">
                <div className="max-w-6xl mx-auto h-full bg-white rounded-2xl shadow-xl border border-slate-200 flex overflow-hidden">
                    <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
                        <div className="p-5 border-b border-slate-200"><h2 className="font-bold text-slate-900">Conversations</h2></div>
                        <div className="flex-1 overflow-y-auto">
                            {applications.length > 0 ? applications.map(app => (
                                <button key={app.id} onClick={() => setSelectedChatId(app.id)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-white transition-all duration-200 group ${selectedChatId === app.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}>
                                    <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{app.trials?.nct_id}</span><span className="text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString()}</span></div>
                                    <div className={`font-bold text-sm line-clamp-2 leading-snug mb-1 ${selectedChatId === app.id ? 'text-indigo-700' : 'text-slate-900'}`}>{app.trials?.title}</div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><div className={`w-2 h-2 rounded-full ${['Not Eligible', 'Withdrawn'].includes(app.site_status) ? 'bg-red-400' : app.site_status === 'New' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>{app.site_status === 'New' ? 'Screening In Progress' : app.site_status}</div>
                                    {/* BADGE ON LIST ITEM */}
                                    {app.unread_count ? <div className="mt-1 flex justify-end"><span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{app.unread_count} New</span></div> : null}
                                </button>
                            )) : <div className="p-8 text-center text-xs text-slate-400">No conversations.</div>}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col bg-white relative">
                        {selectedChatId ? (
                            <>
                                <div className="h-20 border-b border-slate-100 flex items-center px-6 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                    <div><h2 className="font-bold text-slate-900 text-base line-clamp-1">{activeApplication?.trials?.title}</h2><div className="flex items-center gap-3 mt-1"><span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {activeApplication?.site_city || 'Site'}, {activeApplication?.site_state || 'USA'}</span>{isChatDisabled ? <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="h-3 w-3" /> Application Closed</span> : <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Team Online</span>}</div></div>
                                </div>
                                {/* CHAT BOX WITH REF FOR SCROLL */}
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth">
                                    {activeChatMessages.map((msg) => {
                                        const isMe = msg.sender_role === 'patient';
                                        return ( <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}><div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isMe ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}>{isMe ? 'ME' : <Stethoscope className="h-4 w-4" />}</div><div><div className={`p-4 text-sm leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none'}`}>{msg.content}</div><div className={`text-[10px] mt-1.5 opacity-60 ${isMe ? 'text-right pr-1' : 'pl-1'}`}>{formatTime(msg.created_at)}</div></div></div></div> );
                                    })}
                                </div>
                                <div className="p-5 bg-white border-t border-slate-100">
                                    {isChatDisabled ? <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center text-slate-500 text-sm gap-2"><Lock className="h-4 w-4" /> This conversation has been closed.</div> : <div className="relative flex items-center gap-3"><input type="text" className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner" placeholder="Type your message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} /><button onClick={handleSendMessage} disabled={!messageInput.trim()} className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"><Send className="h-5 w-5" /></button></div>}
                                </div>
                            </>
                        ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><MessageSquare className="h-8 w-8 mb-2 opacity-20" /><p className="text-sm font-medium">Select a conversation to start chatting.</p></div>}
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 3: EDUCATION === */}
        {activeTab === 'education' && (
            <div className="p-6 md:p-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <header className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">Patient Guide</span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Understanding Your Journey</h1>
                    <p className="text-slate-500 text-lg">Clinical trials are the bridge to better medicine. Here is exactly what to expect when you participate.</p>
                </header>

                <div className="space-y-20 relative before:absolute before:left-8 md:before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200 before:-ml-px">
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 group">
                        <div className="md:w-1/2 flex justify-end order-2 md:order-1">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 max-w-md relative hover:-translate-y-1 transition-transform duration-300">
                                <div className="absolute top-6 -left-3 w-6 h-6 bg-white rotate-45 border-l border-b border-slate-100 hidden md:block"></div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">1. Screening & Eligibility</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">After you apply, a friendly study coordinator will reach out. This is usually a casual phone call to ask a few health questions and make sure the study is a safe fit for you.</p>
                            </div>
                        </div>
                        <div className="absolute left-8 md:left-1/2 -ml-3 w-6 h-6 rounded-full border-4 border-white bg-indigo-600 shadow-md z-10"></div>
                        <div className="md:w-1/2 order-1 md:order-2 pl-16 md:pl-0">
                            <img src="/education/screening.jpg" className="rounded-2xl shadow-xl w-full max-w-sm h-56 object-cover transform hover:scale-105 transition-transform duration-500" alt="Coordinator calling patient" />
                        </div>
                    </div>

                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 group">
                        <div className="md:w-1/2 flex justify-end order-2 md:order-1 pl-16 md:pl-0">
                             <img src="/education/consent.jpg" className="rounded-2xl shadow-xl w-full max-w-sm h-56 object-cover transform hover:scale-105 transition-transform duration-500" alt="Consultation" />
                        </div>
                        <div className="absolute left-8 md:left-1/2 -ml-3 w-6 h-6 rounded-full border-4 border-white bg-purple-600 shadow-md z-10"></div>
                        <div className="md:w-1/2 order-1 md:order-2">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 max-w-md relative hover:-translate-y-1 transition-transform duration-300">
                                <div className="absolute top-6 -right-3 w-6 h-6 bg-white rotate-45 border-r border-t border-slate-100 hidden md:block"></div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">2. Informed Consent</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">You will sit down with the doctor to review the study details. It is a conversation, not a contract. You can ask anything you want, and you are free to leave the study at any time for any reason.</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 group">
                        <div className="md:w-1/2 flex justify-end order-2 md:order-1">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 max-w-md relative hover:-translate-y-1 transition-transform duration-300">
                                <div className="absolute top-6 -left-3 w-6 h-6 bg-white rotate-45 border-l border-b border-slate-100 hidden md:block"></div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">3. The Study Visits</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">You will visit the clinic for routine check-ups. Think of it as VIP healthcare—the team monitors you closely to ensure you are feeling well. Most studies also reimburse you for your time and travel.</p>
                            </div>
                        </div>
                        <div className="absolute left-8 md:left-1/2 -ml-3 w-6 h-6 rounded-full border-4 border-white bg-emerald-500 shadow-md z-10"></div>
                        <div className="md:w-1/2 order-1 md:order-2 pl-16 md:pl-0">
                            <img src="/education/visit.jpg" className="rounded-2xl shadow-xl w-full max-w-sm h-56 object-cover transform hover:scale-105 transition-transform duration-500" alt="Happy Patient" />
                        </div>
                    </div>
                </div>

                <div className="mt-20 text-center bg-slate-900 text-white p-10 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
                    <h2 className="text-2xl font-bold mb-3">Your Safety is Priority #1</h2>
                    <p className="text-slate-300 max-w-2xl mx-auto mb-8">Every study on our platform has been reviewed by an Institutional Review Board (IRB) and follows strict FDA guidelines to protect your rights and well-being.</p>
                    <Link href="/" className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors">Find a Study</Link>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}