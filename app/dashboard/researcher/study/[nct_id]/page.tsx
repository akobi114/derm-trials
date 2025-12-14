"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ArrowLeft, Users, MapPin, Mail, Phone, Lock, 
  CheckCircle2, Image as ImageIcon, Save, Trash2, Check, X, 
  Video, MessageSquare, UploadCloud, Trophy, TrendingUp, 
  Crown, Lightbulb, ChevronDown, Calendar, Clock, FileText, 
  LayoutDashboard, ClipboardList, ShieldAlert, Filter, Search,
  MoreHorizontal, UserCheck, XCircle, ArrowRight, Calculator, 
  AlertTriangle, AlertCircle, Send, History, BarChart3, PieChart,
  Activity, MousePointerClick, FileEdit, Archive, CheckCheck,
  Eye, MousePointer2, Percent, DollarSign
} from 'lucide-react';
import Link from 'next/link';

// --- CONFIGURATION ---
const SHOW_ANALYTICS_LIVE = true; 

// --- TYPES ---
type LeadStatus = 'New' | 'Contacted' | 'Scheduled' | 'Enrolled' | 'Not Eligible' | 'Withdrawn';

// --- HELPER COMPONENTS ---
const LockedOverlay = ({ title, desc }: { title: string, desc: string }) => (
  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-sm mx-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Lock className="h-8 w-8" /></div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{desc}</p>
          <Link href="/dashboard/researcher/billing" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">View Upgrade Options</Link>
      </div>
  </div>
);

export default function StudyManager() {
  const params = useParams(); 
  const router = useRouter();
  
  // --- STATE ---
  const [profile, setProfile] = useState<any>(null);
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  const [trial, setTrial] = useState<any>(null);
  const [claim, setClaim] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'leads' | 'profile' | 'media' | 'analytics'>('leads'); 
  const [loading, setLoading] = useState(true);
  
  // Content Editing State
  const [customSummary, setCustomSummary] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // CRM / Board State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [noteBuffer, setNoteBuffer] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Drawer Internal State
  const [drawerTab, setDrawerTab] = useState<'overview' | 'messages' | 'history'>('overview');
  const [messageInput, setMessageInput] = useState("");
  const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]); 

  // Modals & UI
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scroll Ref for Chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- TAB HANDLING ---
  const handleTabChange = (tab: 'leads' | 'profile' | 'media' | 'analytics') => {
    setActiveTab(tab);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    window.history.pushState({}, '', newUrl.toString());
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'profile' || tabParam === 'leads' || tabParam === 'media' || tabParam === 'analytics') {
      setActiveTab(tabParam as any);
    }

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profileData } = await supabase.from('researcher_profiles').select('*').eq('user_id', user.id).single();
      if (!profileData) return;
      setProfile(profileData);
      setTier(profileData.tier || 'free');

      const { data: claimData } = await supabase.from('claimed_trials').select('*').eq('nct_id', params.nct_id).eq('researcher_id', profileData.id).single();
      if (!claimData) { router.push('/dashboard/researcher'); return; }
      setClaim(claimData);

      const { data: trialData } = await supabase.from('trials').select('*').eq('nct_id', params.nct_id).single();
      setTrial(trialData);

      setCustomSummary(claimData.custom_brief_summary || trialData.simple_summary || trialData.brief_summary || "");
      setQuestions(claimData.custom_screener_questions || trialData.screener_questions || []);
      setVideoUrl(claimData.video_url || "");
      setFaqs(claimData.custom_faq || []);
      setPhotos(claimData.facility_photos || []);

      if (claimData.status === 'approved') {
          // 1. Fetch Leads
          const { data: leadsData } = await supabase
            .from('leads')
            .select('*')
            .eq('trial_id', params.nct_id)
            .eq('site_city', claimData.site_location?.city)
            .eq('site_state', claimData.site_location?.state)
            .order('created_at', { ascending: false });

          if (leadsData) {
              // 2. Fetch Unread Counts for these leads
              const leadIds = leadsData.map(l => l.id);
              if (leadIds.length > 0) {
                  const { data: unreadMessages } = await supabase
                      .from('messages')
                      .select('lead_id')
                      .eq('is_read', false)
                      .eq('sender_role', 'patient')
                      .in('lead_id', leadIds);

                  // 3. Merge Counts into Leads
                  const leadsWithCounts = leadsData.map(lead => ({
                      ...lead,
                      unread_count: unreadMessages?.filter(m => m.lead_id === lead.id).length || 0
                  }));
                  
                  setLeads(leadsWithCounts);
              } else {
                  setLeads([]);
              }
          }
      }
      setLoading(false);
    }
    fetchData();
  }, [params.nct_id, router]);

  // --- ANALYTICS CALCULATIONS ---
  const analyticsData = useMemo(() => {
      const totalLeads = leads.length;
      const enrolled = leads.filter(l => l.site_status === 'Enrolled').length;
      const notEligible = leads.filter(l => l.site_status === 'Not Eligible').length;
      const scheduled = leads.filter(l => l.site_status === 'Scheduled').length;
      
      const estimatedViews = Math.round(totalLeads * 18.5); 
      const estimatedStarts = Math.round(totalLeads * 2.5);
      const dropOffRate = estimatedStarts > 0 ? Math.round(((estimatedStarts - totalLeads) / estimatedStarts) * 100) : 0;

      const conversionRate = estimatedViews > 0 ? ((enrolled / estimatedViews) * 100).toFixed(2) : "0.00";
      const passRate = totalLeads > 0 ? Math.round(((totalLeads - notEligible) / totalLeads) * 100) : 0;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLeads = leads.filter(l => new Date(l.created_at) > sevenDaysAgo).length;

      const failureCounts: Record<string, number> = {};
      leads.forEach(lead => {
          if (Array.isArray(lead.answers) && questions.length > 0) {
              lead.answers.forEach((ans: string, index: number) => {
                  if (questions[index] && ans !== questions[index].correct_answer) {
                      const qText = questions[index].question;
                      failureCounts[qText] = (failureCounts[qText] || 0) + 1;
                  }
              });
          }
      });
      
      const topFailures = Object.entries(failureCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 4)
          .map(([q, count]) => ({ question: q, count }));

      return { 
          totalLeads, enrolled, scheduled, notEligible,
          estimatedViews, estimatedStarts, dropOffRate,
          conversionRate, passRate, recentLeads, topFailures 
      };
  }, [leads, questions]);

  // --- REALTIME LISTENER (THE FIX IS HERE) ---
  useEffect(() => {
      const channel = supabase
          .channel('researcher-dashboard-channel')
          // 1. Listen for LEAD CHANGES (e.g. Admin moves card)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
              setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
          })
          // 2. Listen for NEW MESSAGES
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
              if (payload.new.sender_role === 'patient') {
                  if (selectedLeadId !== payload.new.lead_id) {
                      // Increment badge if chat closed
                      setLeads(prev => prev.map(l => l.id === payload.new.lead_id ? { ...l, unread_count: (l.unread_count || 0) + 1 } : l));
                  } else {
                      // Append msg if chat open
                      setMessages(prev => [...prev, payload.new]);
                      supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
                  }
              }
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [selectedLeadId]);

  // --- DRAWER DATA ---
  useEffect(() => {
    if (!selectedLeadId) return;
    
    async function fetchDrawerData() {
        const { data: logs } = await supabase.from('audit_logs').select('*').eq('lead_id', selectedLeadId);
        setHistoryLogs(logs || []);
        
        const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', selectedLeadId).order('created_at', { ascending: true });
        setMessages(msgs || []);

        if (drawerTab === 'messages') {
            setLeads(prev => prev.map(l => l.id === selectedLeadId ? { ...l, unread_count: 0 } : l));
            await supabase.from('messages').update({ is_read: true }).eq('lead_id', selectedLeadId).eq('sender_role', 'patient');
        }
    }
    fetchDrawerData();
  }, [selectedLeadId, drawerTab]);

  // --- SCROLL LOGIC ---
  useEffect(() => {
      if (drawerTab === 'messages' && chatContainerRef.current) {
          setTimeout(() => {
              if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
          }, 50);
      }
  }, [messages, drawerTab]);

  // --- LOGIC ---
  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const calculateStrength = () => {
    let score = 0;
    if (customSummary?.length > 50) score += 20;
    if (questions?.length > 0) score += 20;
    if (videoUrl) score += 30;
    if (faqs?.length > 0) score += 15;
    if (photos?.length > 0) score += 15;
    return Math.min(score, 100);
  };
  const strength = calculateStrength();

  // --- HANDLERS ---
  const addQuestion = () => setQuestions([...questions, { question: "", correct_answer: "Yes" }]);
  const removeQuestion = (index: number) => { const newQ = [...questions]; newQ.splice(index, 1); setQuestions(newQ); };
  const updateQuestionText = (index: number, text: string) => { const newQ = [...questions]; newQ[index].question = text; setQuestions(newQ); };
  const toggleAnswer = (index: number) => { const newQ = [...questions]; newQ[index].correct_answer = newQ[index].correct_answer === "Yes" ? "No" : "Yes"; setQuestions(newQ); };

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (index: number) => { const newF = [...faqs]; newF.splice(index, 1); setFaqs(newF); };
  const updateFaq = (index: number, field: 'question'|'answer', text: string) => { const newF = [...faqs]; newF[index][field] = text; setFaqs(newF); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${params.nct_id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('trial-assets').upload(fileName, file); 
    if (uploadError) { alert("Upload failed: " + uploadError.message); } 
    else { const { data } = supabase.storage.from('trial-assets').getPublicUrl(fileName); setPhotos(prev => [...prev, data.publicUrl]); }
    setUploading(false);
  };
  const removePhoto = (urlToRemove: string) => { setPhotos(photos.filter(url => url !== urlToRemove)); };

  const recordAction = async (action: string, detail: string) => {
    if (!selectedLeadId) return;
    const newLog = { 
        id: Date.now(), 
        lead_id: selectedLeadId, 
        action, 
        detail, 
        performed_by: 'You', 
        created_at: new Date().toISOString() 
    };
    setHistoryLogs(prev => [newLog, ...prev]); 
    await supabase.from('audit_logs').insert({ 
        lead_id: selectedLeadId, 
        action, 
        detail, 
        performed_by: 'You' 
    });
  };

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const oldStatus = leads.find(l => l.id === leadId)?.site_status || 'New';
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, site_status: newStatus } : l));
    const { error } = await supabase.from('leads').update({ site_status: newStatus }).eq('id', leadId);
    if (error) {
        const { data: reverted } = await supabase.from('leads').select('site_status').eq('id', leadId).single();
        if (reverted) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, site_status: reverted.site_status } : l));
        alert(`Error updating status: ${error.message}`);
    } else {
        if (leadId === selectedLeadId) recordAction("Status Change", `Moved from ${oldStatus} to ${newStatus}`);
    }
  };

  const saveNote = async () => {
    if (!selectedLead) return;
    const oldNote = selectedLead.researcher_notes || "";
    if (noteBuffer === oldNote) return; 
    
    const { error } = await supabase.from('leads').update({ researcher_notes: noteBuffer }).eq('id', selectedLead.id);
    
    if (!error) {
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, researcher_notes: noteBuffer } : l));
        if (noteBuffer.trim() === "") {
             recordAction("Note Deleted", `Removed note: "${oldNote}"`);
        } else {
             recordAction("Note Updated", `"${noteBuffer}"`);
        }
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedLeadId) return;
    const newMessage = { id: Date.now(), lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher', created_at: new Date().toISOString(), is_read: false };
    
    setMessages(prev => [...prev, newMessage]); 
    setMessageInput("");
    
    await supabase.from('messages').insert({ 
        lead_id: selectedLeadId, 
        content: messageInput, 
        sender_role: 'researcher' 
    });
    
    recordAction("Message Sent", "Outbound message to patient portal.");
  };

  const triggerDelete = () => setIsDeleteModalOpen(true);

  const confirmDeleteLead = async () => {
    if (!selectedLead) return;
    setIsDeleting(true);
    const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id);
    if (error) { alert("Error deleting: " + error.message); } 
    else {
        setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
        setSelectedLeadId(null); 
        setIsDeleteModalOpen(false);
    }
    setIsDeleting(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('claimed_trials').update({ 
        custom_brief_summary: customSummary, 
        custom_screener_questions: questions, 
        video_url: videoUrl, 
        custom_faq: faqs, 
        facility_photos: photos 
    }).eq('nct_id', params.nct_id).eq('researcher_id', profile.id);
    if (error) alert("Save failed.");
    else { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
    setIsSaving(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- KANBAN COLUMN COMPONENT ---
  const StatusColumn = ({ status, label, icon: Icon, colorClass }: any) => {
    const columnLeads = leads.filter(l => {
        if (status === 'Not Eligible') {
            return (l.site_status === 'Not Eligible' || l.site_status === 'Withdrawn') && l.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return (l.site_status || 'New') === status && l.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
            <div className={`p-3 border-b border-slate-200 flex items-center justify-between ${colorClass} bg-opacity-10`}>
                <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
                    <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">{label}</h3>
                </div>
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-slate-500 shadow-sm">{columnLeads.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {columnLeads.map(lead => (
                    <div key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setNoteBuffer(lead.researcher_notes || ""); setDrawerTab('overview'); }} className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md group ${selectedLeadId === lead.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'} relative`}>
                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>{lead.status?.includes('Strong') && <Crown className="h-3 w-3 text-amber-500" />}</div>
                        <div className="text-xs text-slate-500 mb-3 line-clamp-1">{lead.email}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>
                            {lead.site_status === 'Withdrawn' && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Withdrawn</span>}
                            {lead.site_status === 'Not Eligible' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Ineligible</span>}
                            <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* UNREAD BADGE */}
                        {lead.unread_count > 0 && (
                            <div className="absolute bottom-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10 animate-in zoom-in">
                                {lead.unread_count} Unread
                            </div>
                        )}
                    </div>
                ))}
                {columnLeads.length === 0 && <div className="text-center py-10 opacity-30 text-xs font-bold text-slate-400 uppercase">No Candidates</div>}
            </div>
        </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (claim?.status !== 'approved') return <div className="p-10 text-center">Verification Pending.</div>; 

  const calculateMatchScore = () => {
    if (!selectedLead || !trial.screener_questions) return { count: 0, total: 0 };
    const total = trial.screener_questions.length;
    const count = trial.screener_questions.reduce((acc: number, q: any, i: number) => { return acc + (selectedLead.answers && selectedLead.answers[i] === q.correct_answer ? 1 : 0); }, 0);
    return { count, total };
  };
  const matchScore = calculateMatchScore();
  const missedCount = matchScore.total - matchScore.count;

  // --- PREPARE SORTED HISTORY ---
  const getSortedHistory = () => {
      if (!selectedLead) return [];
      const appLog = { id: 'init', action: 'Application Received', detail: 'Patient submitted screening questionnaire.', performed_by: 'System', created_at: selectedLead.created_at };
      const allLogs = [...historyLogs, appLog];
      return allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };
  const sortedHistory = getSortedHistory();

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/researcher" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">{trial?.title}</h1>
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><span className="bg-indigo-50 text-indigo-700 px-1.5 rounded">{trial?.nct_id}</span><span>• {claim?.site_location?.city}, {claim?.site_location?.state}</span></div>
            </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => handleTabChange('leads')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pipeline</button>
            <button onClick={() => handleTabChange('analytics')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><BarChart3 className="h-3 w-3" /> Analytics</button>
            <button onClick={() => handleTabChange('profile')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Edit Page</button>
            <button onClick={() => handleTabChange('media')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'media' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Media</button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* === LEADS PIPELINE VIEW === */}
        {activeTab === 'leads' && (
            <>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-14 border-b border-slate-200 bg-white/50 backdrop-blur-sm flex items-center px-6 justify-between flex-shrink-0">
                        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search patients..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold"><Filter className="h-4 w-4" /> <span>All Candidates ({leads.length})</span></div>
                    </div>
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                        <div className="flex h-full gap-6">
                            <StatusColumn status="New" label="New Applicants" icon={Users} colorClass="bg-blue-500" />
                            <StatusColumn status="Contacted" label="In Screening" icon={Phone} colorClass="bg-amber-500" />
                            <StatusColumn status="Scheduled" label="Scheduled" icon={Calendar} colorClass="bg-purple-500" />
                            <StatusColumn status="Enrolled" label="Enrolled" icon={CheckCircle2} colorClass="bg-emerald-500" />
                            <StatusColumn status="Not Eligible" label="Archived / Withdrawn" icon={Archive} colorClass="bg-slate-500" />
                        </div>
                    </div>
                </div>

                {selectedLead && (
                    <div className="w-[600px] border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-20 transition-all duration-300">
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 bg-slate-50/50">
                            <div><h2 className="font-bold text-slate-900 text-lg">{selectedLead.name}</h2><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ID: {String(selectedLead.id).slice(0,8)}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${selectedLead.status?.includes('Strong') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selectedLead.status || 'Standard'}</span></div></div>
                            <div className="flex items-center gap-2"><button onClick={() => setSelectedLeadId(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="h-5 w-5" /></button></div>
                        </div>
                        <div className="flex border-b border-slate-200 px-6">
                            <button onClick={() => setDrawerTab('overview')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList className="h-4 w-4" /> Overview</button>
                            <button onClick={() => setDrawerTab('messages')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'messages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <MessageSquare className="h-4 w-4" /> Messages
                                {selectedLead.unread_count > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{selectedLead.unread_count}</span>}
                            </button>
                            <button onClick={() => setDrawerTab('history')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${drawerTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><History className="h-4 w-4" /> History</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {drawerTab === 'overview' && (
                                <div className="space-y-6">
                                    <div><h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Contact Details</h3><div className="grid grid-cols-2 gap-4"><div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group bg-white shadow-sm"><div className="flex items-center gap-3 overflow-hidden"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Mail className="h-4 w-4" /></div><div className="text-xs font-bold text-slate-700 truncate">{selectedLead.email}</div></div><a href={`mailto:${selectedLead.email}`} className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 shrink-0">EMAIL</a></div><div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group bg-white shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><Phone className="h-4 w-4" /></div><div className="text-xs font-bold text-slate-700">{selectedLead.phone}</div></div><a href={`tel:${selectedLead.phone}`} className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 shrink-0">CALL</a></div></div></div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline Status</div><div className="relative w-48"><select className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-900 font-bold text-sm rounded-lg py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm" value={selectedLead.site_status || 'New'} onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)}><option value="New">New Applicant</option><option value="Contacted">Contacted / Screening</option><option value="Scheduled">Scheduled Visit</option><option value="Enrolled">Enrolled</option><option value="Not Eligible">Not Eligible</option><option value="Withdrawn">Withdrawn</option></select><ChevronDown className="absolute right-3 top-3 h-3 w-3 text-slate-400 pointer-events-none" /></div></div>
                                    
                                    {/* CLINICAL NOTES SECTION */}
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-64">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Clinical Notes</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-400 italic">Auto-save on blur</span>
                                                <button onClick={saveNote} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"><Save className="h-3 w-3" /> Save Note</button>
                                            </div>
                                        </div>
                                        <textarea className="flex-1 w-full p-4 text-sm text-slate-800 outline-none resize-none font-medium leading-relaxed" placeholder="Enter clinical observations, call logs, or screening notes here..." value={noteBuffer} onChange={(e) => setNoteBuffer(e.target.value)} onBlur={saveNote} />
                                    </div>

                                    {/* SCREENER RESPONSES & HISTORY */}
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Screener Responses & History</h3>
                                        {missedCount > 0 && <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /><div><h4 className="text-sm font-bold text-amber-800">Criteria Mismatch</h4><p className="text-xs text-amber-700 mt-1 leading-relaxed">This patient missed <strong>{missedCount} criteria</strong>. Please contact the patient to verify if their responses are accurate before scheduling.</p></div></div>}
                                        
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2"><FileText className="h-3 w-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Questionnaire Data</span></div>
                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${matchScore.count === matchScore.total ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}><Calculator className="h-3 w-3" />{matchScore.count}/{matchScore.total} Criteria Met</div>
                                            </div>
                                            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                                {trial.screener_questions?.map((q: any, i: number) => { 
                                                    const ans = selectedLead.answers && selectedLead.answers[i]; 
                                                    const isMatch = ans === q.correct_answer; 
                                                    return ( 
                                                        <div key={i} className={`p-4 rounded-xl border ${isMatch ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                                                            <p className="text-sm text-slate-800 font-medium mb-3 leading-relaxed">{q.question}</p>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Patient Answer:</span><span className={`text-xs font-bold px-3 py-1 rounded-md border ${isMatch ? 'text-emerald-700 bg-white border-emerald-200 shadow-sm' : 'text-red-700 bg-white border-red-200 shadow-sm'}`}>{ans || "N/A"}</span></div>
                                                                {!isMatch && (<div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Required:</span><span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded">{q.correct_answer}</span></div>)}
                                                            </div>
                                                        </div> 
                                                    ); 
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {drawerTab === 'messages' && (
                                <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                                        <div className="text-center text-[10px] text-slate-400 uppercase font-bold my-4">— Secure Chat Started —</div>
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.sender_role === 'researcher' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender_role === 'researcher' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}>
                                                    <div>{msg.content}</div>
                                                    <div className="text-[10px] text-indigo-200 mt-1 flex items-center justify-end gap-1">
                                                        {formatTime(msg.created_at)}
                                                        {msg.sender_role === 'researcher' && (
                                                            <span>{msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-400"><MessageSquare className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs">No messages yet.</p><p className="text-[10px] mt-1">Send a message to the patient's portal.</p></div>}
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2"><input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type a secure message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} /><button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Send className="h-4 w-4" /></button></div>
                                </div>
                            )}
                            {drawerTab === 'history' && (
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /> Audit Log</h3><div className="space-y-6 relative pl-2"><div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-100"></div>{sortedHistory.map((log: any, i: number) => { const isAppReceived = log.action === 'Application Received'; return ( <div key={i} className="relative flex gap-4 animate-in slide-in-from-left-2"><div className={`w-3 h-3 rounded-full ring-4 ring-white z-10 shrink-0 mt-1.5 ${isAppReceived ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div><div><div className="text-xs font-bold text-slate-900">{log.action}</div><div className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()} by {log.performed_by}</div><div className="text-xs text-slate-600 mt-1">{log.detail}</div></div></div> ); })}</div></div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center"><span className="text-[10px] text-slate-400">Lead ID: {selectedLead.id}</span><button onClick={triggerDelete} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3" /> Delete</button></div>
                    </div>
                )}
            </>
        )}
        
        {/* === POWERHOUSE ANALYTICS TAB === */}
        {activeTab === 'analytics' && (
            <div className="flex-1 p-8 bg-slate-50 h-full overflow-y-auto">
               {tier === 'free' && <LockedOverlay title="Unlock Clinical Intelligence" desc="Access deep insights into recruitment performance, drop-off rates, and patient demographics." />}
               <div className={tier === 'free' ? 'filter blur-sm pointer-events-none select-none opacity-50' : 'animate-in fade-in slide-in-from-bottom-2 space-y-8 pb-10'}>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Eye className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Est.</span></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedViews.toLocaleString()}</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total Page Views</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><MousePointer2 className="h-5 w-5" /></div></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.conversionRate}%</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Visit-to-Enrolled</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Percent className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{analyticsData.dropOffRate}% Drop-off</span></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedStarts.toLocaleString()}</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Started Screener</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><DollarSign className="h-5 w-5" /></div></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">$0.00</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Cost Per Randomization</p>
                        </div>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8"><h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-600" /> Patient Acquisition Funnel</h3><div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg">Last 30 Days</div></div>
                            <div className="space-y-6 relative">
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-indigo-600 transition-colors">Site Visits</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-indigo-200 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-indigo-50 w-full opacity-50"></div><span className="relative z-10 font-bold text-indigo-900">{analyticsData.estimatedViews}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">100%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-blue-600 transition-colors">Started Survey</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-blue-300 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-blue-50 transition-all duration-1000" style={{ width: '40%' }}></div><span className="relative z-10 font-bold text-blue-900">{analyticsData.estimatedStarts}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">~40%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-amber-600 transition-colors">Completed</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-amber-400 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-amber-50 transition-all duration-1000" style={{ width: `${(analyticsData.totalLeads / (analyticsData.estimatedStarts || 1)) * 100}%` }}></div><span className="relative z-10 font-bold text-amber-900">{analyticsData.totalLeads}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{Math.round((analyticsData.totalLeads / (analyticsData.estimatedStarts || 1)) * 100)}%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-purple-600 transition-colors">Qualified</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-purple-500 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-purple-50 transition-all duration-1000" style={{ width: analyticsData.totalLeads ? `${((analyticsData.totalLeads - analyticsData.notEligible) / analyticsData.totalLeads) * 100}%` : '0%' }}></div><span className="relative z-10 font-bold text-purple-900">{analyticsData.totalLeads - analyticsData.notEligible}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{analyticsData.passRate}%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-emerald-600 transition-colors">Enrolled</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-emerald-500 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-emerald-50 transition-all duration-1000" style={{ width: analyticsData.totalLeads ? `${(analyticsData.enrolled / analyticsData.totalLeads) * 100}%` : '0%' }}></div><span className="relative z-10 font-bold text-emerald-900">{analyticsData.enrolled}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{analyticsData.totalLeads ? Math.round((analyticsData.enrolled / analyticsData.totalLeads) * 100) : 0}%</div></div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2"><Filter className="h-5 w-5 text-red-500" /> Screening Drop-off</h3>
                            <p className="text-xs text-slate-500 mb-8">Which questions disqualify the most patients?</p>
                            {analyticsData.topFailures.length > 0 ? (
                                <div className="space-y-6 flex-1">
                                    {analyticsData.topFailures.map((item, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                                                <span className="truncate max-w-[200px]">{item.question}</span>
                                                <span className="text-red-500">{Math.round((item.count / analyticsData.totalLeads) * 100)}% ({item.count})</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(item.count / analyticsData.totalLeads) * 100}%` }}></div></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (<div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2"><CheckCircle2 className="h-6 w-6 text-emerald-300" /></div><p className="text-xs">No disqualifications recorded yet.</p></div>)}
                            <div className="mt-8 pt-6 border-t border-slate-100"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Lightbulb className="h-4 w-4" /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">AI Recommendation</p><p className="text-xs font-medium text-slate-600 mt-0.5">{analyticsData.passRate < 20 ? "Your criteria may be too strict. Review the top failure reason." : "Screening pass rate is healthy."}</p></div></div></div>
                        </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 flex items-center justify-center text-[10px] font-bold text-indigo-600">45%</div><div><div className="text-sm font-bold text-slate-900">Direct Traffic</div><div className="text-xs text-slate-500">dermtrials.com</div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 flex items-center justify-center text-[10px] font-bold text-blue-600">30%</div><div><div className="text-sm font-bold text-slate-900">Social Media</div><div className="text-xs text-slate-500">Facebook / Instagram</div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-full border-4 border-amber-100 border-t-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-600">25%</div><div><div className="text-sm font-bold text-slate-900">Referrals</div><div className="text-xs text-slate-500">Clinic Partners</div></div></div>
                   </div>
               </div>
            </div>
        )}
        
        {/* === RESTORED PROFILE TAB (FULL) === */}
        {activeTab === 'profile' && (
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20 relative">
                    {tier === 'free' && <LockedOverlay title="Unlock Custom Branding" desc="Free accounts use our standard AI overview. Upgrade to Pro to customize the text and screening questions." />}
                    <div className={tier === 'free' ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit"><Lightbulb className="h-5 w-5" /></div><div><h4 className="font-bold text-blue-900 text-sm mb-1">Why edit this page?</h4><p className="text-blue-700 text-xs leading-relaxed">The "Default" text below was generated by AI based on your protocol. Use this space to edit the language and make any other changes you see fit including the screening questions.<br/><br/><b>Note:</b> You must click "Save Changes" at the bottom for your edits to go live.</p></div></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900 mb-4">Study Overview</h3><textarea className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Enter patient-friendly description..." /></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-900">Screener Questions</h3><button onClick={addQuestion} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{questions.map((q, idx) => (<div key={idx} className="flex gap-4 items-center group"><div className="flex-1"><input type="text" value={q.question} onChange={(e) => updateQuestionText(idx, e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Question..." /></div><button onClick={() => toggleAnswer(idx)} className={`w-24 py-3 rounded-lg text-xs font-bold border ${q.correct_answer === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{q.correct_answer}</button><button onClick={() => removeQuestion(idx)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div>))}</div></div>
                        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-70 transition-all transform hover:-translate-y-0.5">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* === RESTORED MEDIA TAB (FULL) === */}
        {activeTab === 'media' && (
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20 relative">
                    {tier === 'free' && <LockedOverlay title="Boost Engagement with Media" desc="Professional trials get 3x more applicants. Upgrade to add an Intro Video, Facility Photos, and Custom FAQs." />}
                    <div className={tier === 'free' ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start gap-4 mb-6"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Video className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Intro Video</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">Post a 30-second video of yourself (the PI or Coordinator) talking about the trial. <br/><span className="text-indigo-600 font-medium">Why?</span> This humanizes the study and significantly increases the chance of conversion.</p></div></div><input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste link from YouTube, Vimeo, or Loom..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start justify-between mb-6"><div className="flex items-start gap-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ImageIcon className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Facility Photos</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">Upload photos of your lobby, exam rooms, or friendly staff.<br/><span className="text-indigo-600 font-medium">Why?</span> Familiarity breeds trust. Show patients they will be comfortable here.</p></div></div><label className="cursor-pointer text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload Photo <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} /></label></div>{photos.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{photos.map((url, idx) => (<div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"><img src={url} alt="Facility" className="w-full h-full object-cover" /><button onClick={() => removePhoto(url)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600"><Trash2 className="h-4 w-4" /></button></div>))}</div>) : <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50"><ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No photos uploaded yet.</p></div>}</div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Q&A</h3><p className="text-xs text-slate-500">Answer common participant questions to build trust.</p></div></div><button onClick={addFaq} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{faqs.map((f, idx) => (<div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group"><button onClick={() => removeFaq(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button><input type="text" value={f.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-transparent border-b border-slate-200 pb-2 mb-2 text-sm font-bold text-slate-900 outline-none" placeholder="e.g. Do I have to pay for parking?" /><textarea value={f.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none" placeholder="Enter answer here..." rows={2} /></div>))}</div></div>
                        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-70 transition-all">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* TOAST */}
        {showToast && <div className="absolute bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"><Check className="h-4 w-4 text-emerald-400" /> Saved</div>}

        {/* CUSTOM DELETE CONFIRMATION MODAL */}
        {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="flex items-center gap-3 mb-4 text-amber-600 bg-amber-50 p-3 rounded-xl w-fit"><AlertTriangle className="h-6 w-6" /><span className="font-bold text-sm uppercase">Permanent Action</span></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Delete {selectedLead?.name}?</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">This will <strong>permanently remove</strong> this patient record and all history from your database.<br/><br/><span className="font-medium text-slate-700 bg-slate-100 px-1 py-0.5 rounded">⚠️ Recommendation:</span> If they did not qualify, move them to <strong>"Not Eligible"</strong> instead. This keeps your recruitment metrics accurate.</p>
                    <div className="flex gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm">Cancel</button><button onClick={confirmDeleteLead} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2">{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete Forever"}</button></div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}