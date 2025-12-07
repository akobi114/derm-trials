"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      // Navigate to the new search page with the query in the URL
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="relative overflow-hidden bg-white pt-16 pb-32">
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-indigo-50 opacity-40 blur-3xl"></div>

      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Verified Clinical Trials
          </span>
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
          Access Tomorrow’s <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Dermatology Treatments</span>, Today.
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 leading-relaxed">
          Join the exclusive community matching patients with breakthrough skin research. 
          Find paid trials for Psoriasis, Eczema, Acne, and more.
        </p>

        <div className="mx-auto max-w-2xl relative group">
          <div className="absolute inset-0 -z-10 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex w-full items-center rounded-full border border-slate-200 bg-white p-2 shadow-xl shadow-indigo-100/50 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
            <div className="pl-4">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            
            <input
              type="text"
              placeholder="What condition are you looking for? (e.g., Eczema)"
              className="w-full border-none bg-transparent px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <button 
              onClick={handleSearch}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
        </div>

        <p className="mt-8 text-sm font-medium text-slate-500">
          Trusted by research sites at <strong>Stanford</strong>, <strong>Yale</strong>, and <strong>UCSF</strong>.
        </p>
      </div>
    </div>
  );
}