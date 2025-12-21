"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { 
  Activity, FlaskConical, Sparkles, 
  ChevronRight, Zap, ShieldCheck,
  Stethoscope, Mail, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

// Curated Top-Tier Categories for "High-End" Editorial Feel
const FEATURED_AREAS = [
  {
    category: "Inflammatory & Autoimmune",
    icon: <Activity className="h-5 w-5" />,
    description: "Studies for conditions involving skin redness, itching, and long-term inflammation.",
    items: [
      { label: "Acne", slug: "Acne", focus: "Clearer Skin Research" },
      { label: "Eczema", slug: "Atopic%20Dermatitis", focus: "Relief for Itchy Skin" },
      { label: "Psoriasis", slug: "Psoriasis", focus: "Plaque & Scalp Care" }
    ]
  },
  {
    category: "Skin Oncology",
    icon: <FlaskConical className="h-5 w-5" />,
    description: "Advanced research dedicated to the detection and treatment of skin cancers.",
    items: [
      { label: "Skin Cancer", slug: "Melanoma", focus: "Melanoma Research" },
      { label: "Basal Cell", slug: "Basal%20Cell%20Carcinoma", focus: "BCC Care" }
    ]
  }
];

export default function ConditionsAtlas() {
  const [directory, setDirectory] = useState<{letter: string, items: string[]}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDynamicConditions() {
      // 1. Pull unique values from the 'condition' column
      const { data, error } = await supabase
        .from('trials')
        .select('condition')
        .not('condition', 'is', null);

      if (data) {
        // 2. Filter unique names and sort A-Z
        const uniqueConditions = Array.from(new Set(data.map(t => t.condition)))
          .filter(Boolean)
          .sort() as string[];
        
        // 3. Group by First Letter
        const grouped = uniqueConditions.reduce((acc: any, condition: string) => {
          const firstLetter = condition[0].toUpperCase();
          if (!acc[firstLetter]) acc[firstLetter] = [];
          acc[firstLetter].push(condition);
          return acc;
        }, {});

        const formattedDirectory = Object.keys(grouped).sort().map(letter => ({
          letter,
          items: grouped[letter]
        }));

        setDirectory(formattedDirectory);
      }
      setLoading(false);
    }

    fetchDynamicConditions();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100">
      <div className="bg-slate-950">
        <Navbar transparent={true} />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="bg-slate-950 pt-48 pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-25">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950 z-10" />
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <ShieldCheck className="h-3 w-3" /> Secure Patient Discovery Hub
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-none mb-8">
              Clinical Research, <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Simplified.</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
              Explore active studies for your skin health and check your eligibility in minutes. 
              Our guided screening process helps you identify the studies best suited for your health journey.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURED AREAS (Curated for authority) --- */}
      <main className="max-w-7xl mx-auto px-6 py-24 bg-slate-50/30">
        <div className="space-y-32">
          {FEATURED_AREAS.map((group, idx) => (
            <section key={idx}>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-slate-200 pb-8">
                <div className="max-w-md">
                  <div className="flex items-center gap-3 text-indigo-600 mb-3">
                    {group.icon}
                    <h2 className="text-xs font-black uppercase tracking-[0.3em]">{group.category}</h2>
                  </div>
                  <p className="text-slate-500 text-sm font-medium italic">{group.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map((item, itemIdx) => (
                  <Link 
                    key={itemIdx}
                    href={`/condition/${item.slug}`} 
                    className="group bg-white border border-slate-200 rounded-[32px] p-8 transition-all hover:shadow-2xl hover:shadow-indigo-100 hover:border-indigo-100 flex flex-col justify-between min-h-[200px]"
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {item.label}
                        </h3>
                        <Zap className="h-4 w-4 text-slate-200 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 italic">{item.focus}</p>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-indigo-600 transition-colors pt-6 border-t border-slate-50">
                        View Study Details <ChevronRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* --- DYNAMIC A-Z DIRECTORY --- */}
        <section className="mt-48 pt-24 border-t border-slate-200">
          <div className="text-center mb-20">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-600 mb-4">Live Study Registry</h2>
            <p className="text-slate-900 text-3xl font-black uppercase tracking-tight">Browse All Conditions</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syncing with ClinicalTrials.gov...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-12 gap-y-16">
              {directory.map((group) => (
                <div key={group.letter}>
                  <div className="text-4xl font-black text-slate-200 mb-6 border-b border-slate-100 pb-2">{group.letter}</div>
                  <ul className="space-y-4">
                    {group.items.map((item) => (
                      <li key={item}>
                        <Link 
                          href={`/condition/${encodeURIComponent(item)}`} 
                          className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center group"
                        >
                          {item} <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 ml-1 transition-all" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* --- FOOTER CTA --- */}
      <section className="bg-slate-950 py-32 text-center px-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Mail className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Don't see your condition?</h2>
          <p className="text-slate-400 font-medium mb-12 leading-relaxed max-w-md mx-auto">
            New research is onboarded daily. Sign up for notifications to be alerted when a matching study becomes available.
          </p>
          <Link href="/signup" className="px-10 py-4 bg-white text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-slate-100 transition-all shadow-xl">
            Join Notification List
          </Link>
        </div>
      </section>
    </div>
  );
}