"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCardWide from '@/components/TrialCardWide';
import { 
  Search, MapPin, Sparkles, Activity, 
  ChevronRight, ChevronDown, ShieldCheck, Microscope, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// --- EXPANDED CONDITION MAPPING ---
const PREDICTIVE_CONDITIONS = [
  { label: "Acne", search: "Acne", clinical: "Acne Vulgaris" },
  { label: "Eczema", search: "Atopic Dermatitis", clinical: "Atopic Dermatitis" },
  { label: "Psoriasis", search: "Psoriasis", clinical: "Psoriasis" },
  { label: "Rosacea", search: "Rosacea", clinical: "Rosacea" },
  { label: "Hair Loss", search: "Alopecia", clinical: "Alopecia" },
  { label: "Skin Cancer", search: "Melanoma", clinical: "Melanoma" },
  { label: "Hives", search: "Urticaria", clinical: "Urticaria" },
  { label: "Vitiligo", search: "Vitiligo", clinical: "Vitiligo" },
  { label: "Cold Sores", search: "Herpes Simplex", clinical: "Herpes Simplex" },
  { label: "Shingles", search: "Herpes Zoster", clinical: "Herpes Zoster" },
  { label: "Athlete's Foot", search: "Tinea Pedis", clinical: "Tinea Pedis" },
  { label: "Warts", search: "Verruca Vulgaris", clinical: "Verruca Vulgaris" },
  { label: "Ringworm", search: "Tinea Corporis", clinical: "Tinea Corporis" },
  { label: "Melasma", search: "Melasma", clinical: "Chloasma" },
  { label: "Hand Eczema", search: "Dyshidrotic Eczema", clinical: "Dyshidrotic Eczema" },
  { label: "Scalp Psoriasis", search: "Scalp Psoriasis", clinical: "Scalp Psoriasis" },
  { label: "Dry Skin", search: "Xerosis", clinical: "Xerosis" },
  { label: "Excessive Sweating", search: "Hyperhidrosis", clinical: "Hyperhidrosis" }
];

export default function Home() {
  const router = useRouter();

  // --- 1. PRESERVED STATE MANAGEMENT ---
  const [query, setQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [distance, setDistance] = useState(100);
  
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  const [featuredTrials, setFeaturedTrials] = useState<any[]>([]);
  const [popularConditions, setPopularConditions] = useState<string[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- SEARCH UI ISOLATION STATE ---
  const [showPredictions, setShowPredictions] = useState(false);
  const [zipError, setZipError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- NEW: Focused Scroll Trigger ---
  // When predictions are shown, the page centers on the search bar
  useEffect(() => {
    if (showPredictions && dropdownRef.current) {
      dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showPredictions]);

  // Filter conditions based on input
  const filteredPredictions = query 
    ? PREDICTIVE_CONDITIONS.filter(c => 
        c.label.toLowerCase().includes(query.toLowerCase()) || 
        c.clinical.toLowerCase().includes(query.toLowerCase())
      )
    : PREDICTIVE_CONDITIONS;

  // Close dropdown when clicking elsewhere
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 2. PRESERVED DATA FETCHING ---
  useEffect(() => {
    async function getStatsAndFeatured() {
      setLoadingStats(true);
      try {
        const { count } = await supabase
          .from('trials')
          .select('*', { count: 'exact', head: true })
          .ilike('status', 'recruiting');
        setRecruitingCount(count || 0);

        const { data: featuredData } = await supabase
          .from('trials')
          .select('*')
          .ilike('status', 'recruiting')
          .order('last_updated', { ascending: false })
          .limit(3);
        setFeaturedTrials(featuredData || []);

        const { data: conditionData } = await supabase.from('trials').select('condition');
        if (conditionData) {
          const unique = Array.from(new Set(conditionData.map(c => c.condition).filter(Boolean))).sort();
          setPopularConditions(unique.slice(0, 4));
        }
      } catch (err) {
        console.error("Error fetching home stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    getStatsAndFeatured();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // REQUIREMENT: Strict 5-digit Zip Code Check
    if (zipCode.length !== 5) {
      setZipError(true);
      return;
    }
    setZipError(false);

    const params = new URLSearchParams();
    if (query.trim()) {
      // Map to clinical term if available
      const matched = PREDICTIVE_CONDITIONS.find(c => c.label.toLowerCase() === query.trim().toLowerCase());
      params.set('q', matched ? matched.search : query.trim());
    }
    if (zipCode.trim()) params.set('zip', zipCode.trim());
    params.set('radius', distance.toString());
    router.push(`/search?${params.toString()}`);
  };

  const handlePredictionSelect = (condition: { label: string }) => {
    // REQUIREMENT: Populate bar only
    setQuery(condition.label);
    setShowPredictions(false);
  };

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 z-50">
           <Navbar />
        </div>

        {/* SECTION 1: HERO CONTAINER */}
        <section className="relative h-[100vh] flex items-center">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/40 to-transparent z-10" />
            <img 
              src="/images/learn/hero-wellness.jpg" 
              alt="Wellness" 
              className="w-full h-full object-cover object-right lg:object-[90%_center]"
            />
          </div>
          
          <div className="relative z-20 max-w-7xl mx-auto px-6 w-full pt-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-fit"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {recruitingCount !== null ? `${recruitingCount} Active Studies Recruiting` : "Locating studies..."}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-[clamp(2.5rem,6vw,4.5rem)] font-black tracking-tight text-white leading-[1.02] mb-8">
                <span className="block opacity-90 text-[0.85em] font-bold tracking-tight mb-1">Access Tomorrow’s</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7] py-1">
                  Dermatology
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7] py-1">
                  Treatments
                </span>
                <span className="block opacity-90 text-[0.85em] font-bold tracking-tight mt-1">Today.</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed mb-10 max-w-md">
                Join the exclusive community matching patients with breakthrough skin research. Find trials for Psoriasis, Eczema, Acne, and more.
              </p>

              {/* SEARCH BAR WRAPPER */}
              <div className="relative scroll-mt-24" ref={dropdownRef}>
                <form 
                  onSubmit={handleFormSubmit} 
                  className="w-full max-w-2xl bg-white p-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-2"
                >
                  <div className="relative w-full md:flex-[2] px-6 py-2 group">
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-indigo-600" />
                      <div className="text-left flex-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Condition</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Atopic Dermatitis" 
                          className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm" 
                          value={query} 
                          onFocus={() => setShowPredictions(true)}
                          onChange={(e) => setQuery(e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:block w-px h-8 bg-slate-100 mx-1"></div>

                  <div className="relative w-full md:flex-1 px-6 py-2 group">
                    <div className="flex items-center gap-3">
                      <MapPin className={`h-5 w-5 transition-colors ${zipError ? 'text-red-500' : 'text-indigo-600'}`} />
                      <div className="text-left flex-1">
                        <label className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 transition-colors ${zipError ? 'text-red-500' : 'text-slate-400'}`}>
                          {zipError ? '5 Digits Required' : 'Zip Code'}
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. 85001" 
                          maxLength={5} 
                          className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm" 
                          value={zipCode} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setZipCode(val);
                            if (val.length === 5) setZipError(false);
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-indigo-700 transition-all shadow-lg">
                    Search
                  </button>
                </form>

                <AnimatePresence>
                  {showPredictions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 w-full md:w-2/3 bg-white border border-slate-200 rounded-2xl mt-4 shadow-2xl overflow-hidden z-[100]"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {query ? "Suggested Conditions" : "Popular Research Areas"}
                        </span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredPredictions.map((item) => (
                          <button
                            key={item.clinical}
                            type="button"
                            onClick={() => handlePredictionSelect(item)}
                            className="w-full text-left px-6 py-4 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-medium italic">{item.clinical}</span>
                            </div>
                            <Sparkles className="h-4 w-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <motion.button
            onClick={scrollToContent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center text-white/50 hover:text-white transition-colors group"
          >
            <div className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
              <ChevronDown className="h-5 w-5" />
            </div>
          </motion.button>
        </section>
      </div>

      <div ref={contentRef} className="py-12 border-b border-slate-100 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Research Partners</p>
          <span className="text-xl font-bold text-slate-800 tracking-tighter italic">Stanford Medicine</span>
          <span className="text-xl font-bold text-slate-800 tracking-tighter italic">Yale University</span>
          <span className="text-xl font-bold text-slate-800 tracking-tighter italic">UCSF Health</span>
          <span className="text-xl font-bold text-slate-800 tracking-tighter italic">Mount Sinai</span>
        </div>
      </div>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[48px] overflow-hidden flex flex-col md:flex-row items-center">
          <div className="flex-1 p-12 md:p-20">
            <span className="text-indigo-400 font-black tracking-widest text-xs uppercase mb-6 block">Participant Education</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight tracking-tight">Your path to <br /> medical discovery.</h2>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
              We've simplified the clinical research process so you can focus on your health. Learn about our safety protocols and what to expect at every step.
            </p>
            <Link href="/learn" className="inline-flex items-center gap-3 text-white font-bold group">
              <span className="border-b-2 border-indigo-500 pb-1 group-hover:border-white transition-all">Learn how trials work</span>
              <ChevronRight className="h-5 w-5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="flex-1 w-full h-full min-h-[400px]">
            <img src="/images/learn/process-modern.jpg" alt="The Journey" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </section>

      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Newly Recruiting</h2>
              <p className="text-slate-500 font-medium">Breakthrough dermatology studies updated today.</p>
            </div>
            <Link href="/search" className="hidden md:flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid gap-6">
            {featuredTrials.map((trial) => (
              <TrialCardWide key={trial.id} trial={trial} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Research Categories</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Explore active research for the most common skin conditions currently recruiting volunteers.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularConditions.map((cond) => (
            <Link key={cond} href={`/search?q=${encodeURIComponent(cond)}`} className="group p-8 bg-white border border-slate-200 rounded-3xl hover:border-indigo-300 hover:shadow-2xl transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Microscope className="h-6 w-6" />
              </div>
              <h3 className="font-black text-xl text-slate-900 mb-2">{cond}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Active research opportunities for {cond} patients.</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}