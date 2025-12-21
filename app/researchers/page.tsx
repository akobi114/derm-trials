"use client";

import { useState } from 'react';
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, Activity, Users, LayoutDashboard, 
  MessageSquare, ArrowRight, Search, FileText, 
  Video, Globe, ClipboardList, MapPin, ExternalLink, Loader2,
  Cpu, Zap, CheckCircle2, Columns
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ForResearchers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [trialResult, setTrialResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocateStudy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setTrialResult(null);

    const cleanQuery = searchQuery.trim();

    try {
      const { data, error: dbError } = await supabase
        .from('trials')
        .select('id, nct_id, title, condition, phase, status')
        .or(`nct_id.ilike.%${cleanQuery}%,title.ilike.%${cleanQuery}%`) 
        .limit(1)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError("Protocol not found. Please verify the NCT ID or Title.");
      } else {
        setTrialResult(data);
      }
    } catch (err) {
      console.error("Search Error:", err);
      setError("An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 z-50">
           <Navbar hideSearch={true} />
        </div>

        {/* --- SECTION 1: HERO --- */}
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-slate-950">
          <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent z-10" />
            <img 
              src="/images/research/lab-facility.jpg" 
              alt="Research Facility" 
              className="w-full h-full object-cover object-center"
            />
          </div>
          
          <div className="relative z-20 max-w-7xl mx-auto px-6 w-full pt-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-fit"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                <ShieldCheck className="h-3 w-3" /> Secure Investigator Access
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-[clamp(2.5rem,6vw,4.5rem)] font-black tracking-tight text-white leading-[1.02] mb-8 uppercase">
                <span className="block opacity-90 text-[0.85em] font-bold tracking-tight mb-1 capitalize">Intelligent</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7] py-1">
                  Enrollment
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7] py-1">
                  Engines
                </span>
                <span className="block opacity-90 text-[0.85em] font-bold tracking-tight mt-1 capitalize">Powered by AI.</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed mb-10 max-w-md">
                A centralized gateway for Principal Investigators to claim protocols and access a validated, AI-prescreened candidate queue.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* --- BIGGER BUTTON: Hero --- */}
                <Link 
                  href="/auth/signup?role=researcher" 
                  className="px-14 py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.25em] text-[11px] rounded-full hover:bg-indigo-700 hover:scale-105 transition-all shadow-2xl shadow-indigo-500/20 text-center"
                >
                  Claim My Trials
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* --- SECTION 2: PROTOCOL LOCATOR --- */}
      <section className="relative z-30 -mt-12 px-6">
        <form 
          onSubmit={handleLocateStudy}
          className="max-w-4xl mx-auto bg-white p-2 rounded-2xl md:rounded-full shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-2"
        >
          <div className="relative w-full md:flex-[2] px-6 py-2">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-indigo-600" />
              <div className="text-left flex-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Protocol Locator</label>
                <input 
                  type="text" 
                  placeholder="Enter NCT ID (e.g. NCT0543210)..." 
                  className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-slate-800 transition-all flex items-center justify-center min-w-[180px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Locate Study"}
          </button>
        </form>
        <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           AI Prescreening automatically enabled for claimed protocols
        </p>
      </section>

      {/* --- SECTION 3: WIDECARD PREVIEW --- */}
      <AnimatePresence>
        {trialResult && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-6 pt-12"
          >
             <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full">
                      {trialResult.status || 'Active'}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full flex items-center gap-1.5 animate-pulse">
                      <Cpu className="h-3 w-3" /> AI Validation Enabled
                    </span>
                  </div>

                  <Link 
                    href={`/trial/${trialResult.nct_id}`} 
                    target="_blank" 
                    className="group inline-flex items-start gap-2 mb-2 outline-none"
                  >
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors cursor-pointer decoration-indigo-600/30 group-hover:underline underline-offset-4">
                      {trialResult.title || trialResult.condition}
                    </h3>
                    <ExternalLink className="h-4 w-4 text-slate-300 mt-1 group-hover:text-indigo-600 transition-colors" />
                  </Link>

                  <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
                    <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-indigo-500" /> {trialResult.phase || 'Phase Not Set'}</span>
                    <span className="flex items-center gap-1 text-emerald-600"><Zap className="h-3 w-3" /> 90% Lead Fidelity</span>
                  </div>
                </div>

                {/* --- BIGGER BUTTON: Search Result --- */}
                <Link 
                  href={`/auth/signup?role=researcher&claim=${trialResult.nct_id}`} 
                  className="px-10 py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-500/10 whitespace-nowrap"
                >
                  Claim My Trials
                </Link>
             </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --- SECTION 4: CAPABILITIES --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Automated Eligibility Filter</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                Our AI ingest your specific I/E criteria to conduct interactive, natural-language screening interviews with every candidate.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">High-Fidelity Leads</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                Stop wasting time on non-qualifiers. Only high-probability candidates who meet protocol benchmarks reach your dashboard.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Columns className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Unified Lead Command</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                Replace fragmented spreadsheets with a visual enrollment funnel. Manage recruitment status from AI-validated leads to enrolled participants in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 5: SITE INFRASTRUCTURE --- */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4 uppercase">Site Infrastructure</h2>
            <p className="text-slate-500 font-medium italic">Advanced Study Coordination for High-Volume Research Sites</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Core Portal</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Standard Study Ownership</p>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> AI-Validated Inquiry Access
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Visual Pipeline Management
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure Protocol Ownership
                </li>
              </ul>
              <Link href="/auth/signup?role=researcher" className="w-full py-4 bg-slate-100 text-slate-900 text-center font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-slate-200 transition-all">
                Create Free Account
              </Link>
            </div>

            <div className="bg-slate-900 p-10 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Professional</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Enterprise Coordination</h3>
              <p className="text-sm text-slate-400 mb-8 font-medium italic">High-Volume Site Management</p>
              
              <ul className="space-y-4 mb-10 flex-1 relative z-10">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-200">
                  <Cpu className="h-4 w-4 text-indigo-400" /> Custom AI Screener & Logic Control
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-200">
                  <Users className="h-4 w-4 text-indigo-400" /> Sub-PI & Coordinator Multi-Accounts
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-200">
                  <Globe className="h-4 w-4 text-indigo-400" /> Research Group Landing Pages
                </li>
              </ul>
              <Link href="/auth/signup?role=researcher" className="block w-full py-4 bg-indigo-600 text-white text-center font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/50">
                Register Institutional Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 bg-white text-center px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight uppercase leading-tight">Secure Study <br /> Ownership.</h2>
          <p className="text-slate-500 mb-10 text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Claims are manually verified to ensure protocol security. Registration grants access to your study dashboard and AI-validated candidate queue.
          </p>
          {/* --- BIGGER BUTTON: Final CTA --- */}
          <Link 
            href="/auth/signup?role=researcher" 
            className="inline-flex items-center gap-6 px-16 py-6 bg-slate-950 text-white font-black uppercase tracking-[0.25em] text-[12px] rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-2xl shadow-slate-900/20"
          >
            Claim My Trials <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}