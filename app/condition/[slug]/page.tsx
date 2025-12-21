"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCard from '@/components/TrialCard';
import { 
  ArrowLeft, Loader2, Cpu, Zap, 
  ShieldCheck, Activity, Search 
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ConditionPage() {
  const params = useParams();
  const router = useRouter();
  const condition = decodeURIComponent(params.slug as string);
  
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrials() {
      const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('condition', condition);

      if (data) {
        // PRESERVED: Original Custom Sort Logic
        const sorted = data.sort((a, b) => {
          const statusA = (a.status || "").toLowerCase();
          const statusB = (b.status || "").toLowerCase();
          const isRecruitingA = statusA === 'recruiting';
          const isRecruitingB = statusB === 'recruiting';
          if (isRecruitingA && !isRecruitingB) return -1;
          if (!isRecruitingA && isRecruitingB) return 1;
          const isFutureA = statusA.includes('not yet');
          const isFutureB = statusB.includes('not yet');
          if (isFutureA && !isFutureB) return -1;
          if (!isFutureA && isFutureB) return 1;
          const isActiveA = statusA.includes('active');
          const isActiveB = statusB.includes('active');
          if (isActiveA && !isActiveB) return -1;
          if (!isActiveA && isActiveB) return 1;
          return 0;
        });
        setTrials(sorted);
      }
      setLoading(false);
    }
    fetchTrials();
  }, [condition]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVBAR: Blended with Hero background using the transparent prop */}
      <div className="bg-slate-950">
        <Navbar transparent={true} />
      </div>

      {/* --- INSTITUTIONAL HERO SECTION (CANDIDATE CENTERED) --- */}
      <section className="bg-slate-950 pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950 z-10" />
           <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto">
          <Link href="/conditions" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-3 w-3" /> Back to All Conditions
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-6">
                <ShieldCheck className="h-3 w-3" /> Secure Patient Discovery
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none mb-4">
                {condition} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Clinical Studies</span>
              </h1>
              {/* UPDATED LANGUAGE: Focused on Candidate Guidance */}
              <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed max-w-xl">
                Explore active studies for your skin health and check your eligibility in minutes. 
                Our guided screening process helps you identify the studies best suited for your health journey.
              </p>
            </motion.div>

            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                <div className="text-center">
                    <div className="text-2xl font-black text-white">{trials.length}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Studies</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-2xl font-black text-emerald-400 flex items-center gap-1">Instant <Zap className="h-4 w-4" /></div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eligibility Active</div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- RESULTS SECTION --- */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-center justify-between mb-12">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Clinical Studies</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase border border-emerald-100">
                <ShieldCheck className="h-3 w-3" /> Secure Enrollment Active
            </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Updating Study Database...</p>
          </div>
        ) : trials.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {trials.map((trial) => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[40px] border border-slate-200 shadow-sm px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Search className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Active Studies Found</h3>
            <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto mb-8 leading-relaxed">
              New studies are added daily. Try a different search term or check back soon for clinical research involving {condition}.
            </p>
            <Link href="/conditions" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-indigo-700 transition-all shadow-lg">
              Explore All Conditions
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}