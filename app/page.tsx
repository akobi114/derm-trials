"use client";

import Navbar from "@/components/Navbar";
import TrialGrid from "@/components/TrialGrid";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LIVE_TRIAL_COUNT = 312; 

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <main className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-700">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <div className="relative isolate pt-14 lg:pt-20 pb-20">
        
        {/* Background Glow (Pointer events none allows clicking through it) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 transform-gpu blur-3xl sm:top-[-10rem] pointer-events-none" aria-hidden="true">
          <div 
            className="aspect-[1100/600] w-[70rem] bg-gradient-to-tr from-[#9089fc] to-[#ff80b5] opacity-20" 
            style={{ 
              clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
            }} 
          />
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8 relative z-10">
          
          {/* Flashing Badge */}
          <div className="mb-8 flex justify-center">
            <div className="relative inline-flex items-center gap-x-2 rounded-full border border-slate-200 bg-white/60 backdrop-blur-sm px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {LIVE_TRIAL_COUNT} Trials Recruiting Now
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl mb-6">
            Access Tomorrow’s <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
              Dermatology Treatments.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Join the exclusive community matching patients with breakthrough skin research. Find paid trials for Psoriasis, Eczema, Acne, and more.
          </p>

          {/* REAL SEARCH BAR */}
          <div className="relative z-50 mt-10 flex items-center justify-center">
            <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
              <div className="group flex w-full items-center gap-4 rounded-full border border-slate-200 bg-white p-2 pl-6 shadow-lg hover:border-indigo-300 hover:shadow-xl transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300">
                <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500" />
                
                <input 
                  type="text"
                  className="flex-1 bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none h-12"
                  placeholder="What condition do you have? (e.g., Eczema)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <button 
                  type="submit"
                  className="rounded-full bg-[#6366f1] px-8 py-3 text-base font-bold text-white shadow-md hover:bg-indigo-600 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Trusted By */}
          <div className="mt-16 pb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
              Trusted by Research Sites At
            </p>
            <div className="flex justify-center gap-12 opacity-40 grayscale mix-blend-multiply">
              <span className="text-2xl font-serif font-bold text-slate-800">Stanford</span>
              <span className="text-2xl font-serif font-bold text-slate-800">Yale</span>
              <span className="text-2xl font-serif font-bold text-slate-800">UCSF</span>
              <span className="text-2xl font-serif font-bold text-slate-800">Mayo Clinic</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- FEATURED OPPORTUNITIES --- */}
      <TrialGrid searchQuery="" />

    </main>
  );
}