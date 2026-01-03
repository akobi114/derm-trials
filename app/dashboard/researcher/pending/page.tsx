"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  MessageSquare,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Import the shared modal
import SupportModal from '../components/SupportModal';

export default function PendingVerificationPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false); // State for the modal

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // This forces Next.js to re-run the layout check 
    // by refreshing the current route's data context.
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-[3.5rem] p-12 lg:p-16 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-700">
        
        {/* ICON STACK */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center h-full text-indigo-600">
            <Clock className="h-10 w-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-4">
          Verification <span className="text-indigo-600">Pending</span>
        </h1>
        
        <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
          Our clinical operations team is currently reviewing your <strong>Institutional Credentials</strong> and facility address. This standard security check ensures site integrity.
        </p>

        {/* STATUS CHECKLIST */}
        <div className="grid grid-cols-1 gap-4 bg-slate-50 p-8 rounded-3xl mb-10 text-left border border-slate-100">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-slate-600 font-bold uppercase tracking-tight">Account Created Successfully</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin shrink-0" />
            <p className="text-sm text-slate-900 font-black uppercase tracking-tight">Verifying Medical License & Badge</p>
          </div>
          <div className="flex items-center gap-4 opacity-40">
            <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
            <p className="text-sm text-slate-400 font-bold uppercase tracking-tight">Unlock Institutional Dashboard</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check Status
          </button>
          
          <button 
            onClick={() => setIsSupportOpen(true)}
            className="flex-1 px-8 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center justify-center gap-3"
          >
            <MessageSquare className="h-4 w-4" />
            Support Chat
          </button>
        </div>

        <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
            <Building2 className="h-3.5 w-3.5" /> Est. Time: 2-4 Business Hours
          </div>
          <button 
            onClick={handleLogout}
            className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* RENDER MODAL */}
      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
      />
    </div>
  );
}