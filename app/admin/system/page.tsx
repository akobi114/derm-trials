"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; 
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase"; 
import { 
  Loader2, CheckCircle, RefreshCw, Database, 
  Bot, Sparkles, Play, AlertCircle, History, FileText, ExternalLink,
  ClipboardCheck, Eye, ArrowLeft, LayoutDashboard
} from "lucide-react";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function SystemOps() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState({ processed: 0, success: 0, failed: 0 });
  const [batchStatus, setBatchStatus] = useState(""); 
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('trials')
      .select('nct_id, title, simple_summary, screener_questions, inclusion_criteria')
      .not('simple_summary', 'is', null)
      .order('last_updated', { ascending: false }) 
      .limit(20); 

    if (!error && data) setHistory(data);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncStatus({ type: null, msg: '' });
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok) setSyncStatus({ type: 'success', msg: data.message });
      else setSyncStatus({ type: 'error', msg: data.error || 'Sync failed' });
    } catch (err) {
      setSyncStatus({ type: 'error', msg: 'Failed to connect to sync server.' });
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
          fetchHistory(); 
          setBatchStatus(`Cooling down...`);
          await wait(2000); 
          batchCount++;
        } else {
          keepGoing = false;
          if (batchCount === 1) setAiLogs([{ id: "SYSTEM_MSG", status: "Info", summary: "All caught up! No new trials to process." }]);
        }
      }
    } catch (err) {
      console.error("Agent failed", err);
      setAiLogs(prev => [...prev, { id: "ERROR", status: "Failed", error: "Connection interrupted." }]);
    } finally {
      setAiLoading(false);
      setBatchStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER & NAV */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Operations</h1>
            <p className="text-slate-500">Data ingestion, AI processing, and audit logs.</p>
          </div>
          
          <Link 
            href="/admin" 
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pipeline
          </Link>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* SYNC */}
          <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">1. Data Ingestion</h2>
                <p className="text-sm text-slate-500">Source: ClinicalTrials.gov</p>
              </div>
            </div>
            {syncStatus.type === 'success' && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 text-sm">
                <CheckCircle className="h-4 w-4" /> <span className="font-bold">{syncStatus.msg}</span>
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={syncLoading || aiLoading} 
              className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-6 py-4 font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {syncLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {syncLoading ? "Syncing..." : "Run Sync"}
            </button>
          </div>

          {/* AI AGENT */}
          <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Bot className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">2. AI Agent</h2>
                <p className="text-sm text-slate-500">Generates overview & screener questions</p>
              </div>
            </div>
            <button
              onClick={runAIAgent}
              disabled={aiLoading || syncLoading}
              className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70"
            >
              {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {aiLoading ? (batchStatus || "Agent Working...") : "Run Smart Agent"}
            </button>
          </div>
        </div>

        {/* LOGS */}
        {(aiLogs.length > 0 || aiLoading) && (
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden mb-12">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Play className="h-4 w-4 text-indigo-600" /> Live Logs</h3>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider"><span className="text-emerald-600">Success: {aiStats.success}</span></div>
            </div>
            <div className="max-h-64 overflow-y-auto p-0">
              {aiLogs.map((log, i) => (
                <div key={i} className="p-4 border-b border-slate-50 text-sm flex items-center gap-3">
                    {log.status === 'Success' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className="font-mono text-slate-500 text-xs">{log.id}</span>
                    <span className={log.status === 'Success' ? "text-slate-700" : "text-red-600"}>{log.status === 'Success' ? "Processed successfully" : log.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-slate-400" />
              Quality Control (Audit Log)
            </h3>
            <button onClick={fetchHistory} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              Refresh List
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.nct_id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{item.nct_id}</span>
                    <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                  </div>
                  <Link href={`/trial/${item.nct_id}`} target="_blank" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    View Page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}