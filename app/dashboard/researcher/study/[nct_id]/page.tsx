"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ArrowLeft, Users, 
  MapPin, Mail, Phone, Lock, CheckCircle2,
  Unlock, CreditCard, Image as ImageIcon, Save,
  Plus, Trash2, Check, X, Video, MessageSquare, UploadCloud,
  Trophy, TrendingUp, Crown, Lightbulb,
  ChevronDown, ClipboardList, Calendar, Clock, FileText
} from 'lucide-react';
import Link from 'next/link';

export default function StudyManager() {
  const params = useParams(); 
  const router = useRouter();
  
  // --- STATE DECLARATIONS ---
  const [profile, setProfile] = useState<any>(null);
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  const [trial, setTrial] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<Set<number>>(new Set()); 
  
  const [activeTab, setActiveTab] = useState<'leads' | 'profile' | 'media'>('leads'); 
  const [loading, setLoading] = useState(true);
  
  // Content State
  const [customSummary, setCustomSummary] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // CRM State (Drawer)
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteBuffer, setNoteBuffer] = useState("");

  // Modals & UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false); // <--- FIXED: Defined here
  const [leadToUnlock, setLeadToUnlock] = useState<any>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'profile' || tabParam === 'leads' || tabParam === 'media') {
      setActiveTab(tabParam);
    }

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 1. Fetch Profile & Tier
      const { data: profileData } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!profileData) return;
      setProfile(profileData);
      setTier(profileData.tier || 'free');

      const { data: claim } = await supabase.from('claimed_trials').select('*').eq('nct_id', params.nct_id).eq('researcher_id', profileData.id).single();
      if (!claim) { alert("Unauthorized."); router.push('/dashboard/researcher'); return; }

      const { data: trialData } = await supabase.from('trials').select('*').eq('nct_id', params.nct_id).single();
      setTrial(trialData);

      setCustomSummary(claim.custom_brief_summary || trialData.simple_summary || trialData.brief_summary || "");
      setQuestions(claim.custom_screener_questions || trialData.screener_questions || []);
      setVideoUrl(claim.video_url || "");
      setFaqs(claim.custom_faq || []);
      setPhotos(claim.facility_photos || []);

      const { data: leadsData } = await supabase.from('leads').select('*').eq('trial_id', params.nct_id).order('created_at', { ascending: false });
      setLeads(leadsData || []);

      const { data: unlockData } = await supabase.from('lead_unlocks').select('lead_id').eq('researcher_id', profileData.id);
      if (unlockData) setUnlocks(new Set(unlockData.map(u => u.lead_id)));

      setLoading(false);
    }
    fetchData();
  }, []);

  // --- HANDLERS ---
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

  const saveSettings = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('claimed_trials').update({ custom_brief_summary: customSummary, custom_screener_questions: questions, video_url: videoUrl, custom_faq: faqs, facility_photos: photos }).eq('nct_id', params.nct_id);
    if (error) { alert("Failed to save."); } 
    else { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
    setIsSaving(false);
  };

  // --- CRM & LEAD HANDLERS ---
  const openLeadDrawer = (lead: any) => {
    setSelectedLead(lead);
    setNoteBuffer(lead.researcher_notes || "");
  };

  const saveNote = async () => {
    const { error } = await supabase.from('leads').update({ researcher_notes: noteBuffer }).eq('id', selectedLead.id);
    if (!error) setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, researcher_notes: noteBuffer } : l));
  };

  const updateLeadStatus = async (leadId: number, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, workflow_status: newStatus } : l));
    if (selectedLead?.id === leadId) setSelectedLead((prev: any) => ({ ...prev, workflow_status: newStatus }));
    await supabase.from('leads').update({ workflow_status: newStatus }).eq('id', leadId);
  };

  const initiateUnlock = (lead: any) => { setLeadToUnlock(lead); setIsUnlockModalOpen(true); };
  const confirmUnlock = async () => {
    if (!leadToUnlock) return;
    setUnlockLoading(true);
    const { error } = await supabase.from('lead_unlocks').insert({ lead_id: leadToUnlock.id, researcher_id: profile.id });
    if (error) { alert("Error."); } else { setUnlocks(prev => new Set(prev).add(leadToUnlock.id)); setIsUnlockModalOpen(false); setLeadToUnlock(null); }
    setUnlockLoading(false);
  };

  // --- LOCKED OVERLAY ---
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/researcher" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                    <h1 className="text-sm font-bold text-slate-900 truncate max-w-md">{trial.title}</h1>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{trial.nct_id}</span>
                        {/* PLAN BADGE */}
                        {tier === 'pro' ? (
                            <button onClick={() => setIsPlanModalOpen(true)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors">
                                <Crown className="h-3 w-3 text-amber-500" /> Plan: Professional
                            </button>
                        ) : (
                            <button onClick={() => setIsPlanModalOpen(true)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors">
                                Free Plan
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('leads')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Candidates <span className="ml-1 bg-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">{leads.length}</span></button>
                <button onClick={() => setActiveTab('profile')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Study Page</button>
                <button onClick={() => setActiveTab('media')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'media' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Media & FAQ</button>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 pb-24">

        {/* LISTING STRENGTH */}
        {activeTab !== 'leads' && (
            <div className="bg-indigo-900 rounded-xl p-6 mb-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden gap-4">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-yellow-400" /><h2 className="font-bold text-lg">Listing Strength: {strength}%</h2></div>
                    <div className="w-full max-w-md h-2 bg-indigo-950 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-1000" style={{ width: `${strength}%` }}></div></div>
                    <p className="text-indigo-200 text-xs mt-2 font-medium">{strength < 100 ? "Add a Video and FAQ to boost patient conversion by 3x." : "Excellent! Your listing is fully optimized."}</p>
                </div>
                {strength < 100 && <button onClick={() => setActiveTab('media')} className="bg-white text-indigo-900 px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors shadow-lg z-10 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Improve Listing</button>}
            </div>
        )}
        
        {/* --- LEADS TAB (CRM) --- */}
        {activeTab === 'leads' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                {leads.length > 0 ? (
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Workflow</th>
                                    <th className="px-6 py-4">Candidate</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead) => {
                                    const isUnlocked = unlocks.has(lead.id);
                                    const statusMap: any = { 'New': 'bg-blue-100 text-blue-700', 'Contacted': 'bg-amber-100 text-amber-700', 'Scheduled': 'bg-purple-100 text-purple-700', 'Enrolled': 'bg-emerald-100 text-emerald-700', 'Lost': 'bg-slate-100 text-slate-600' };
                                    const currentStatus = lead.workflow_status || 'New';

                                    return (
                                        <tr key={lead.id} onClick={() => openLeadDrawer(lead)} className="group hover:bg-indigo-50/30 transition-colors cursor-pointer">
                                            <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${lead.status.includes('Strong') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{lead.status}</span></td>
                                            <td className="px-6 py-4">
                                                <div onClick={(e) => e.stopPropagation()} className="relative inline-block w-32">
                                                    <select value={currentStatus} onChange={(e) => updateLeadStatus(lead.id, e.target.value)} className={`appearance-none w-full cursor-pointer pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border ${statusMap[currentStatus]} bg-white focus:outline-none`}>
                                                        {['New', 'Contacted', 'Scheduled', 'Enrolled', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 opacity-70"><ChevronDown className="h-3 w-3" /></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{isUnlocked ? <div className="font-bold text-slate-900">{lead.name}</div> : <div className="font-bold text-slate-800 flex items-center gap-2">Candidate #{lead.id.toString().slice(-4)}<Lock className="h-3 w-3 text-slate-300" /></div>}</td>
                                            <td className="px-6 py-4">{isUnlocked ? <div className="flex flex-col"><span className="text-indigo-600 font-medium flex items-center gap-1.5 text-xs"><Mail className="h-3 w-3" /> {lead.email}</span></div> : <div className="blur-[5px] select-none text-slate-300">hidden@email.com</div>}</td>
                                            <td className="px-6 py-4 text-right">{isUnlocked ? <div className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100"><CheckCircle2 className="h-3 w-3" /> Unlocked</div> : <button onClick={(e) => { e.stopPropagation(); initiateUnlock(lead); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 shadow-md">Unlock</button>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="p-20 text-center text-slate-400">No leads yet.</div>}
            </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20 relative">
                {tier === 'free' && <LockedOverlay title="Unlock Custom Branding" desc="Free accounts use our standard AI overview. Upgrade to Pro to customize the text and screening questions." />}
                <div className={tier === 'free' ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit"><Lightbulb className="h-5 w-5" /></div><div><h4 className="font-bold text-blue-900 text-sm mb-1">Why edit this page?</h4><p className="text-blue-700 text-xs leading-relaxed">The "Default" text below was generated by AI based on your protocol. Use this space to edit the language and make any other changes you see fit including the screening questions.<br/><br/><b>Note:</b> You must click "Save Changes" at the bottom for your edits to go live.</p></div></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900 mb-4">Study Overview</h3><textarea className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Enter patient-friendly description..." /></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-900">Screener Questions</h3><button onClick={addQuestion} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{questions.map((q, idx) => (<div key={idx} className="flex gap-4 items-center group"><div className="flex-1"><input type="text" value={q.question} onChange={(e) => updateQuestionText(idx, e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Question..." /></div><button onClick={() => toggleAnswer(idx)} className={`w-24 py-3 rounded-lg text-xs font-bold border ${q.correct_answer === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{q.correct_answer}</button><button onClick={() => removeQuestion(idx)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div>))}</div></div>
                    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-70 transition-all transform hover:-translate-y-0.5">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>
                </div>
            </div>
        )}

        {/* --- MEDIA TAB --- */}
        {activeTab === 'media' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20 relative">
                {tier === 'free' && <LockedOverlay title="Boost Engagement with Media" desc="Professional trials get 3x more applicants. Upgrade to add an Intro Video, Facility Photos, and Custom FAQs." />}
                <div className={tier === 'free' ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start gap-4 mb-6"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Video className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Intro Video</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">Post a 30-second video of yourself (the PI or Coordinator) talking about the trial. <br/><span className="text-indigo-600 font-medium">Why?</span> This humanizes the study and significantly increases the chance of conversion.</p></div></div><input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste link from YouTube, Vimeo, or Loom..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start justify-between mb-6"><div className="flex items-start gap-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ImageIcon className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Facility Photos</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">Upload photos of your lobby, exam rooms, or friendly staff.<br/><span className="text-indigo-600 font-medium">Why?</span> Familiarity breeds trust. Show patients they will be comfortable here.</p></div></div><label className="cursor-pointer text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload Photo <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} /></label></div>{photos.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{photos.map((url, idx) => (<div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"><img src={url} alt="Facility" className="w-full h-full object-cover" /><button onClick={() => removePhoto(url)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600"><Trash2 className="h-4 w-4" /></button></div>))}</div>) : <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50"><ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No photos uploaded yet.</p></div>}</div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Q&A</h3><p className="text-xs text-slate-500">Answer common participant questions to build trust.</p></div></div><button onClick={addFaq} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{faqs.map((f, idx) => (<div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group"><button onClick={() => removeFaq(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button><input type="text" value={f.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-transparent border-b border-slate-200 pb-2 mb-2 text-sm font-bold text-slate-900 outline-none" placeholder="e.g. Do I have to pay for parking?" /><textarea value={f.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none" placeholder="Enter answer here..." rows={2} /></div>))}</div></div>
                    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-70 transition-all">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>
                </div>
            </div>
        )}

        {/* --- PATIENT 360 DRAWER (SLIDE-OVER) --- */}
        {selectedLead && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLead(null)}></div>
                <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2"><h2 className="text-xl font-bold text-slate-900">{unlocks.has(selectedLead.id) ? selectedLead.name : `Candidate #${selectedLead.id}`}</h2><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${selectedLead.status.includes('Strong') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selectedLead.status}</span></div>
                            <div className="flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Applied: {new Date(selectedLead.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Status: {selectedLead.workflow_status || 'New'}</span></div>
                        </div>
                        <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Users className="h-4 w-4 text-indigo-600" /> Contact Details</h3>{!unlocks.has(selectedLead.id) && <button onClick={() => initiateUnlock(selectedLead)} className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-700">Unlock to View</button>}</div>
                            {unlocks.has(selectedLead.id) ? (<div className="grid grid-cols-2 gap-4"><div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Email</div><a href={`mailto:${selectedLead.email}`} className="text-sm font-bold text-indigo-600 hover:underline truncate block">{selectedLead.email}</a></div><div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Phone</div><a href={`tel:${selectedLead.phone}`} className="text-sm font-bold text-indigo-600 hover:underline block">{selectedLead.phone}</a></div></div>) : (<div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center text-slate-400 text-sm italic"><Lock className="h-4 w-4 mx-auto mb-1" /> Contact info hidden until unlocked.</div>)}
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5"><h3 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Internal Notes</h3><textarea className="w-full bg-white border border-amber-200 rounded-lg p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-400 min-h-[100px]" placeholder="Add notes about this patient..." value={noteBuffer} onChange={(e) => setNoteBuffer(e.target.value)} onBlur={saveNote} /><p className="text-[10px] text-amber-600/70 mt-2 text-right italic">Autosaves when you click away.</p></div>
                        <div><h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-600" /> Screener Responses</h3><div className="space-y-3">{trial.screener_questions?.map((q: any, i: number) => { const patientAnswer = selectedLead.answers && selectedLead.answers[i]; const isMatch = patientAnswer === q.correct_answer; return (<div key={i} className={`p-3 rounded-lg border text-sm ${isMatch ? 'bg-white border-slate-200' : 'bg-red-50 border-red-100'}`}><p className="text-slate-700 font-medium mb-1">{q.question}</p><div className="flex gap-2 items-center"><span className={`text-xs font-bold px-2 py-0.5 rounded ${isMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Answer: {patientAnswer || "N/A"}</span>{!isMatch && <span className="text-[10px] text-slate-400">(Required: {q.correct_answer})</span>}</div></div>); })}</div></div>
                    </div>
                </div>
            </div>
        )}

        {/* MODALS */}
        {showToast && <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"><div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-800"><div className="bg-emerald-500 rounded-full p-1"><Check className="h-3 w-3 text-white" /></div><span className="font-bold text-sm">Changes saved successfully</span><button onClick={() => setShowToast(false)} className="ml-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></div></div>}
        {isPlanModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden"><div className="bg-slate-900 p-6 text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" /> Professional Plan</h3><p className="text-slate-400 text-sm">Active & Verified</p></div><div className="p-6"><div className="space-y-4 mb-6"><div className="flex items-start gap-3"><div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full mt-0.5"><Check className="h-3 w-3" /></div><div><h4 className="font-bold text-slate-900 text-sm">Monthly Subscription</h4><p className="text-xs text-slate-500">Includes Profile Hosting, Custom Video, and Unlimited Edits.</p></div></div><div className="flex items-start gap-3"><div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full mt-0.5"><Check className="h-3 w-3" /></div><div><h4 className="font-bold text-slate-900 text-sm">Lead Generation</h4><p className="text-xs text-slate-500">Pay only for qualified leads you choose to unlock.</p></div></div></div><div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center"><p className="text-xs text-slate-500 mb-1">Current Status</p><p className="text-sm font-bold text-slate-900">Free Beta Access (No Charges)</p></div></div><div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end"><button onClick={() => setIsPlanModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Close</button></div></div></div>}
        {isUnlockModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden flex flex-col items-center text-center"><div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4"><Unlock className="h-6 w-6" /></div><h3 className="text-lg font-bold text-slate-900 mb-2">Reveal Contact Info?</h3><p className="text-sm text-slate-500 mb-6 leading-relaxed">This reveals data for <b>Candidate #{leadToUnlock?.id}</b>.<br/><span className="inline-block mt-2 text-xs bg-slate-100 py-1 px-2 rounded font-medium"><CreditCard className="h-3 w-3 inline mr-1" /> 1 Credit ($50.00)</span></p><div className="flex gap-3 w-full"><button onClick={() => setIsUnlockModalOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm">Cancel</button><button onClick={confirmUnlock} disabled={unlockLoading} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg text-sm">{unlockLoading ? "Processing..." : "Unlock Now"}</button></div></div></div>}

      </div>
    </div>
  );
}