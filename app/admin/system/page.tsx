"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; 
import { useRouter } from "next/navigation"; // Import useRouter
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase"; 
import { 
  Loader2, CheckCircle, RefreshCw, Database, 
  Bot, Sparkles, Play, AlertCircle, History, ExternalLink,
  ArrowLeft, ChevronDown, ChevronUp, Clock, Check, Undo,
  FileText, ListChecks, BookOpen, ShieldAlert, Building2, User, X,
  ShieldCheck 
} from "lucide-react";

// --- HELPERS ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 🔒 SECURITY: Replace this with the exact email you use to log in!
const ADMIN_EMAIL = "akobic14@gmail.com"; 

export default function SystemOps() {
  const router = useRouter(); // Initialize router
  const [activeTab, setActiveTab] = useState<'trials' | 'researchers'>('trials');
  
  // Trial State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState({ processed: 0, success: 0, failed: 0 });
  const [batchStatus, setBatchStatus] = useState(""); 
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [reviewedList, setReviewedList] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Researcher State
  const [researcherList, setResearcherList] = useState<any[]>([]);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastAiTime, setLastAiTime] = useState<string | null>(null);

  // --- 1. SECURITY CHECK & INITIAL LOAD ---
  useEffect(() => {
    async function checkUserAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Not logged in? -> Login Page
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Logged in, but NOT the Admin? -> Kick to Home
      if (user.email !== ADMIN_EMAIL) {
        console.warn("Unauthorized access attempt to System Ops by:", user.email);
        router.push('/'); 
        return;
      }

      // 3. Allowed -> Run Fetches
      fetchLists();
      fetchResearcherQueue();
      fetchSystemStats();
    }
    checkUserAndLoad();
  }, [router]);

  const fetchSystemStats = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const sync = data.find(d => d.key === 'last_sync_run');
      const ai = data.find(d => d.key === 'last_ai_run');
      if (sync?.value) setLastSyncTime(new Date(sync.value).toLocaleString());
      if (ai?.value) setLastAiTime(new Date(ai.value).toLocaleString());
    }
  };

  const updateSystemTimestamp = async (key: 'last_sync_run' | 'last_ai_run') => {
    const now = new Date().toISOString();
    await supabase.from('system_settings').upsert({ key, value: now });
    fetchSystemStats();
  };

  const fetchLists = async () => {
    const columnsToFetch = `nct_id, title, simple_summary, brief_summary, detailed_summary, screener_questions, inclusion_criteria, last_updated`;
    const { data: pending } = await supabase.from('trials').select(columnsToFetch).not('simple_summary', 'is', null).eq('is_reviewed', false).order('last_updated', { ascending: false }).limit(50); 
    const { data: reviewed } = await supabase.from('trials').select(columnsToFetch).eq('is_reviewed', true).order('last_updated', { ascending: false }).limit(50);
    if (pending) setPendingList(pending);
    if (reviewed) setReviewedList(reviewed);
  };

  const fetchResearcherQueue = async () => {
    const { data } = await supabase.from('researcher_profiles').select('*').eq('is_verified', false).order('created_at', { ascending: false });
    if (data) setResearcherList(data);
  };

  const verifyResearcher = async (id: string) => {
    const { error } = await supabase.from('researcher_profiles').update({ is_verified: true }).eq('id', id);
    if (!error) { alert("Researcher Verified!"); fetchResearcherQueue(); }
  };

  const rejectResearcher = async (id: string) => {
    if(!confirm("Are you sure? This deletes the profile.")) return;
    const { error } = await supabase.from('researcher_profiles').delete().eq('id', id);
    if(!error) fetchResearcherQueue();
  };

  const toggleReviewStatus = async (nctId: string, newStatus: boolean) => {
    if (newStatus) {
      const item = pendingList.find(i => i.nct_id === nctId);
      if (item) {
        setPendingList(prev => prev.filter(i => i.nct_id !== nctId));
        setReviewedList(prev => [item, ...prev]);
      }
    } else {
      const item = reviewedList.find(i => i.nct_id === nctId);
      if (item) {
        setReviewedList(prev => prev.filter(i => i.nct_id !== nctId));
        setPendingList(prev => [item, ...prev]);
      }
    }
    await supabase.from('trials').update({ is_reviewed: newStatus }).eq('nct_id', nctId);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncStatus({ type: null, msg: '' });
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatus({ type: 'success', msg: data.message });
        await updateSystemTimestamp('last_sync_run');
        fetchLists();
      } else {
        setSyncStatus({ type: 'error', msg: data.message || "Sync returned 0 results or failed." });
      }
    } catch (err) {
      setSyncStatus({ type: 'error', msg: 'Failed to connect to server.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const runAIAgent = async () => {
    setAiLoading(true);
    setAiLogs([]); 
    setAiStats({ processed: 0, success: 0, failed: 0 });
    setBatchStatus("Starting Auto-Pilot...");
    let keepGoing = true;
    let batchCount = 1;
    try {
      while (keepGoing) {
        setBatchStatus(`Processing Batch #${batchCount}...`);
        const res = await fetch('/api/generate');
        const data = await res.json();
        if (data.details && data.details.length > 0) {
          setAiLogs(prev => [...prev, ...data.details]);
          const newSuccess = data.details.filter((d: any) => d.status === 'Success').length;
          setAiStats(prev => ({
            processed: prev.processed + data.details.length,
            success: prev.success + newSuccess,
            failed: prev.failed + (data.details.length - newSuccess)
          }));
          fetchLists(); 
          setBatchStatus(`Cooling down...`);
          await wait(2000); 
          batchCount++;
        } else {
          keepGoing = false;
          if (batchCount === 1) setAiLogs([{ id: "SYSTEM_MSG", status: "Info", summary: "All caught up! No new trials to process." }]);
        }
      }
      await updateSystemTimestamp('last_ai_run');
    } catch (err) {
      console.error("Agent failed", err);
      setAiLogs(prev => [...prev, { id: "ERROR", status: "Failed", error: "Connection interrupted." }]);
    } finally {
      setAiLoading(false);
      setBatchStatus("");
    }
  };

  const TrialRow = ({ item, isReviewed }: { item: any, isReviewed: boolean }) => {
    const isExpanded = expandedId === item.nct_id;
    const [tab, setTab] = useState<'brief' | 'detailed'>('brief');
    return (
        <div className={`group transition-all border-b border-slate-100 ${isReviewed ? 'bg-slate-50/50' : 'hover:bg-indigo-50/30'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.nct_id)}>
                <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{item.nct_id}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Updated: {new Date(item.last_updated).toLocaleString()}</span>
                    </div>
                    <h4 className={`font-bold text-sm ${isReviewed ? 'text-slate-500' : 'text-slate-800'}`}>{item.title}</h4>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => toggleReviewStatus(item.nct_id, !isReviewed)} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${isReviewed ? 'bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'}`}>
                    {isReviewed ? <><Undo className="h-3 w-3" /> Undo</> : <><Check className="h-3 w-3" /> Mark Verified</>}
                </button>
                <Link href={`/trial/${item.nct_id}`} target="_blank" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><ExternalLink className="h-4 w-4" /></Link>
            </div>
          </div>
          {isExpanded && (
            <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                <div className="bg-white border border-slate-200 rounded-xl shadow-inner overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-slate-100">
                        <div className="p-6 bg-indigo-50/30 border-r border-slate-100">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3"><Sparkles className="h-4 w-4" /> AI Summary</div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{item.simple_summary || "Pending..."}</p>
                        </div>
                        <div className="p-6 bg-white">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-6">
                                <Database className="h-4 w-4" /> Official Source Data
                            </div>
                            <div className="mb-8">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Brief Summary</h5>
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.brief_summary || <span className="italic text-slate-400">No brief summary provided.</span>}</p>
                            </div>
                            <div>
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Detailed Description</h5>
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.detailed_summary || <span className="italic text-slate-400">No detailed description provided for this study.</span>}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="p-6 bg-indigo-50/30 border-r border-slate-100">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3"><ListChecks className="h-4 w-4" /> AI Quiz</div>
                            {item.screener_questions ? <ul className="space-y-2">{item.screener_questions.map((q: any, i: number) => <li key={i} className="text-xs bg-white p-2 rounded shadow-sm"><div className="font-bold text-slate-800">Q: {q.question}</div><div className="text-emerald-600 font-mono text-[10px]">Ans: {q.correct_answer}</div></li>)}</ul> : <span className="text-xs italic text-slate-400">No questions.</span>}
                        </div>
                        <div className="p-6 bg-white">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-3"><ShieldAlert className="h-4 w-4" /> Official Criteria</div>
                            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-lg border border-slate-100">{item.inclusion_criteria || "No criteria."}</pre>
                        </div>
                    </div>
                    {!isReviewed && <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={() => toggleReviewStatus(item.nct_id, true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 text-sm shadow"><Check className="h-4 w-4" /> Verify</button></div>}
                </div>
            </div>
          )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Operations</h1>
            <p className="text-slate-500">Master Control: Data, AI, and User Verification.</p>
          </div>
          <Link href="/admin" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Pipeline
          </Link>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
            <button onClick={() => setActiveTab('trials')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'trials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Trial Management
            </button>
            <button onClick={() => setActiveTab('researchers')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'researchers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Researcher Approvals {researcherList.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{researcherList.length}</span>}
            </button>
        </div>

        {/* TAB 1: TRIALS */}
        {activeTab === 'trials' && (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database className="h-6 w-6" /></div><div><h2 className="text-lg font-bold text-slate-900">1. Data Ingestion</h2><p className="text-xs text-slate-400 flex items-center gap-1">Last Run: {lastSyncTime || "Never"}</p></div></div>
                        </div>
                        {syncStatus.type === 'success' && <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 text-sm"><CheckCircle className="h-4 w-4" /> <span className="font-bold">{syncStatus.msg}</span></div>}
                        {syncStatus.type === 'error' && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 text-sm"><AlertCircle className="h-4 w-4" /> <span className="font-bold">{syncStatus.msg}</span></div>}
                        <div className="mt-auto space-y-4">
                            <div className="text-xs text-slate-400 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">TARGETS: All 10 Dermatology Conditions</div>
                            <button onClick={handleSync} disabled={syncLoading || aiLoading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-6 py-4 font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50">
                            {syncLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />} {syncLoading ? "Syncing..." : "Run Bulk Import"}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Bot className="h-6 w-6" /></div><div><h2 className="text-lg font-bold text-slate-900">2. AI Agent</h2><p className="text-xs text-slate-400 flex items-center gap-1">Last Run: {lastAiTime || "Never"}</p></div></div>
                        </div>
                        <button onClick={runAIAgent} disabled={aiLoading || syncLoading} className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70">
                        {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} {aiLoading ? (batchStatus || "Agent Working...") : "Run Smart Agent"}
                        </button>
                    </div>
                </div>
                {(aiLogs.length > 0 || aiLoading) && (
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden mb-12">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Play className="h-4 w-4 text-indigo-600" /> Live Logs</h3><div className="flex gap-4 text-xs font-bold uppercase tracking-wider"><span className="text-emerald-600">Success: {aiStats.success}</span></div></div>
                    <div className="max-h-64 overflow-y-auto p-0">
                    {aiLogs.map((log, i) => (
                        <div key={i} className="p-4 border-b border-slate-50 text-sm flex items-center gap-3">
                            {log.status === 'Success' || log.status === 'Info' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="font-mono text-slate-500 text-xs">{log.id}</span>
                            <span className={log.status === 'Success' || log.status === 'Info' ? "text-slate-700" : "text-red-600"}>{log.summary || (log.status === 'Success' ? "Processed successfully" : log.error)}</span>
                        </div>
                    ))}
                    </div>
                </div>
                )}
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden mb-12">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><History className="h-5 w-5 text-amber-500" /> Pending Review ({pendingList.length})</h3><button onClick={fetchLists} className="text-xs font-bold text-indigo-600 hover:bg-white px-3 py-1.5 rounded-lg transition-colors">Refresh</button></div>
                    <div className="bg-white">{pendingList.length > 0 ? pendingList.map((item) => <TrialRow key={item.nct_id} item={item} isReviewed={false} />) : <div className="p-10 text-center text-slate-400">All caught up! No trials pending review.</div>}</div>
                </div>
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> Reviewed History ({reviewedList.length})</h3></div>
                    <div className="bg-slate-50">{reviewedList.length > 0 ? reviewedList.map((item) => <TrialRow key={item.nct_id} item={item} isReviewed={true} />) : <div className="p-10 text-center text-slate-400">No reviewed trials yet.</div>}</div>
                </div>
            </>
        )}

        {/* --- TAB 2: RESEARCHERS --- */}
        {activeTab === 'researchers' && (
            <div className="max-w-4xl">
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Building2 className="h-5 w-5 text-indigo-600" /> Pending Approvals</h3>
                        <button onClick={fetchResearcherQueue} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">Refresh</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {researcherList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No new researcher applications.</p>
                            </div>
                        ) : (
                            researcherList.map((r) => (
                                <div key={r.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2"><h4 className="font-bold text-slate-900 text-lg">{r.company_name || "Unknown Company"}</h4><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Pending</span></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> {r.full_name} ({r.role})</div>
                                                <div className="flex items-center gap-2 font-mono bg-slate-100 px-2 py-1 rounded w-fit"><ShieldAlert className="h-3 w-3 text-slate-400" /> NPI: {r.npi_number || "N/A"}</div>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">Applied: {new Date(r.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => rejectResearcher(r.id)} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2"><X className="h-4 w-4" /> Reject</button>
                                            <button onClick={() => verifyResearcher(r.id)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Approve & Verify</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}