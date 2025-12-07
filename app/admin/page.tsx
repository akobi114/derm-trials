"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Loader2, CheckCircle, RefreshCw, Server, Database } from "lucide-react";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  const handleSync = async () => {
    setLoading(true);
    setStatus({ type: null, msg: '' });

    try {
      const res = await fetch('/api/sync');
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', msg: data.message });
      } else {
        setStatus({ type: 'error', msg: data.error || 'Sync failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to connect to sync server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-20">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Server className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">System Dashboard</h1>
          <p className="mt-4 text-slate-600 text-lg">
            Manage your clinical trial database and ingestion pipelines.
          </p>
        </div>

        <div className="grid gap-6">
          {/* SYNC CARD */}
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Ingestion Engine</h2>
                    <p className="text-sm text-slate-500">ClinicalTrials.gov V2 API</p>
                  </div>
               </div>
               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
               </span>
            </div>

            <p className="text-slate-600 mb-8 leading-relaxed">
              This pipeline fetches active, recruiting, and upcoming dermatology studies from the US government database. 
              It will populate the database with raw technical data which can then be processed by AI.
            </p>
            
            {/* Success Message */}
            {status.type === 'success' && (
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-700 animate-in fade-in zoom-in">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{status.msg}</span>
              </div>
            )}

            {/* Error Message */}
            {status.type === 'error' && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
                <span className="font-medium">Error: {status.msg}</span>
              </div>
            )}

            {/* The Magic Button */}
            <button
              onClick={handleSync}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-slate-900 px-8 py-4 font-bold text-white text-lg shadow-lg hover:bg-indigo-600 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Fetching & Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Sync ClinicalTrials.gov
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}