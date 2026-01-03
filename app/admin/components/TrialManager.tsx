"use client";

import React, { useState } from 'react';
import { 
  RefreshCw, Database, Bot, Sparkles, Play, Clock, CheckCircle, 
  AlertCircle, Loader2, History, ExternalLink, ChevronUp, ChevronDown, Check, Undo, ListChecks, ShieldAlert
} from "lucide-react";

export default function TrialManager({ 
  syncLoading, syncStatus, handleSync, lastSyncTime,
  aiLoading, aiLogs, aiStats, batchStatus, runAIAgent, lastAiTime,
  pendingList, reviewedList, toggleReviewStatus
}: any) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const TrialRow = ({ item, isReviewed }: { item: any, isReviewed: boolean }) => {
        const isExpanded = expandedId === item.nct_id;
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
                    <a href={`/trial/${item.nct_id}`} target="_blank" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><ExternalLink className="h-4 w-4" /></a>
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
                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-6"><Database className="h-4 w-4" /> Official Source Data</div>
                                <div className="mb-8">
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Brief Summary</h5>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.brief_summary || "No brief summary."}</p>
                                </div>
                                <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Detailed Description</h5>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.detailed_summary || "No detailed description."}</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-6 bg-indigo-50/30 border-r border-slate-100">
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3"><ListChecks className="h-4 w-4" /> AI Quiz</div>
                                {item.screener_questions ? (
                                    <ul className="space-y-2">
                                        {item.screener_questions.map((q: any, i: number) => (
                                            <li key={i} className="text-xs bg-white p-2 rounded shadow-sm">
                                                <div className="font-bold text-slate-800">Q: {q.question}</div>
                                                <div className="text-emerald-600 font-mono text-[10px]">Ans: {q.correct_answer}</div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <span className="text-xs italic text-slate-400">No questions.</span>}
                            </div>
                            <div className="p-6 bg-white">
                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-3"><ShieldAlert className="h-4 w-4" /> Official Criteria</div>
                                <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-lg border border-slate-100">{item.inclusion_criteria || "No criteria."}</pre>
                            </div>
                        </div>
                    </div>
                </div>
              )}
            </div>
        );
    };

    return (
        <div className="p-8 space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SYNC ENGINE */}
                <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database className="h-6 w-6" /></div>
                        <div><h2 className="text-lg font-bold text-slate-900">1. Data Ingestion</h2><p className="text-xs text-slate-400">Last Run: {lastSyncTime || "Never"}</p></div>
                    </div>
                    {syncStatus.type && (
                        <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-sm font-bold ${syncStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {syncStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {syncStatus.msg}
                        </div>
                    )}
                    <button onClick={handleSync} disabled={syncLoading || aiLoading} className="w-full py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {syncLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />} Run Bulk Import
                    </button>
                </div>

                {/* AI AGENT */}
                <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Bot className="h-6 w-6" /></div>
                        <div><h2 className="text-lg font-bold text-slate-900">2. AI Agent</h2><p className="text-xs text-slate-400">Last Run: {lastAiTime || "Never"}</p></div>
                    </div>
                    <button onClick={runAIAgent} disabled={aiLoading || syncLoading} className="mt-auto w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                        {aiLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="h-5 w-5" />} {aiLoading ? (batchStatus || "Agent Working...") : "Run Smart Agent"}
                    </button>
                </div>
            </div>

            {/* LIVE LOGS */}
            {(aiLogs.length > 0 || aiLoading) && (
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Play className="h-4 w-4 text-indigo-600" /> Live Logs</h3><span className="text-xs font-bold text-emerald-600 uppercase">Success: {aiStats.success}</span></div>
                    <div className="max-h-64 overflow-y-auto">
                        {aiLogs.map((log: any, i: number) => (
                            <div key={i} className="p-4 border-b border-slate-50 text-sm flex items-center gap-3">
                                {log.status === 'Success' || log.status === 'Info' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                                <span className="font-mono text-slate-500 text-xs">{log.id}</span>
                                <span className={log.status === 'Success' || log.status === 'Info' ? "text-slate-700" : "text-red-600"}>{log.summary || log.error}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* REVIEW QUEUE */}
            <div className="space-y-8">
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b bg-amber-50/50 flex items-center justify-between"><h3 className="font-bold text-slate-900 flex items-center gap-2"><History className="h-5 w-5 text-amber-500" /> Pending Review ({pendingList.length})</h3></div>
                    {pendingList.length > 0 ? pendingList.map((item: any) => <TrialRow key={item.nct_id} item={item} isReviewed={false} />) : <div className="p-10 text-center text-slate-400">All caught up!</div>}
                </div>
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <div className="p-6 border-b bg-emerald-50/50 flex items-center justify-between"><h3 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> Reviewed History ({reviewedList.length})</h3></div>
                    {reviewedList.length > 0 ? reviewedList.map((item: any) => <TrialRow key={item.nct_id} item={item} isReviewed={true} />) : <div className="p-10 text-center text-slate-400">No reviewed trials.</div>}
                </div>
            </div>
        </div>
    );
}