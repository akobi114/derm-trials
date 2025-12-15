"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import TrialCard from "./TrialCard";
import TrialCardWide from "./TrialCardWide"; // <--- IMPORTING THE NEW CARD
import NoResults from "./NoResults"; 
import { ChevronLeft, ChevronRight, Sparkles, Search, Filter } from "lucide-react"; 

export interface Trial {
  id: string;
  nct_id: string;
  title: string;
  condition: string;
  location: string;
  status: string;
  tags: string[];
  simple_title?: string;
  sponsor?: string;
}

export default function TrialGrid({ searchQuery }: { searchQuery: string }) {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [suggestedTrials, setSuggestedTrials] = useState<Trial[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTrials() {
      setLoading(true);
      
      const { data: allTrials } = await supabase.from('trials').select('*');
      
      if (!allTrials) {
        setLoading(false);
        return;
      }

      if (searchQuery) {
        // --- SEARCH MODE ---
        const lowerQuery = searchQuery.toLowerCase();
        
        const filtered = allTrials.filter((trial) => {
          const titleMatch = trial.title.toLowerCase().includes(lowerQuery);
          const conditionMatch = trial.condition.toLowerCase().includes(lowerQuery);
          const tagMatch = trial.tags?.some((tag: string) => 
            tag.toLowerCase().includes(lowerQuery)
          );
          return titleMatch || conditionMatch || tagMatch;
        });

        if (filtered.length > 0) {
          setTrials(filtered as any[]);
          const others = allTrials.filter(t => !filtered.includes(t));
          setSuggestedTrials(others as any[]);
        } else {
          setTrials([]); 
          setSuggestedTrials(allTrials as any[]); 
        }
      } else {
        // --- HOMEPAGE MODE ---
        setTrials(allTrials as any[]);
        setSuggestedTrials([]);
      }

      setLoading(false);
    }

    fetchTrials();
  }, [searchQuery]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 400; 
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 w-full bg-slate-100 rounded-2xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  // CASE 1: No matches found
  if (trials.length === 0 && searchQuery) {
    return <NoResults query={searchQuery} suggestedTrials={suggestedTrials} />;
  }

  // CASE 2: Homepage (Carousel Mode) - Uses Vertical Cards
  if (!searchQuery) {
    return (
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Featured Opportunities</h2>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => scroll("left")} className="rounded-full bg-white p-2 shadow-md border border-slate-100 hover:bg-slate-50 hover:scale-105 transition-all">
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <button onClick={() => scroll("right")} className="rounded-full bg-white p-2 shadow-md border border-slate-100 hover:bg-slate-50 hover:scale-105 transition-all">
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} 
          >
            {trials.map((trial) => (
              <div key={trial.id} className="min-w-[350px] md:min-w-[400px] snap-start">
                <TrialCard trial={trial} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // CASE 3: Search Results (List Layout) - USES NEW WIDE CARDS
  return (
    <>
      <section className="py-12 bg-slate-50 min-h-[600px]">
        <div className="mx-auto max-w-5xl px-6">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Search Results</p>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  Matches for <span className="text-indigo-600">"{searchQuery}"</span>
                </h2>
             </div>
             <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                <Filter className="h-4 w-4" />
                {trials.length} {trials.length === 1 ? 'Study' : 'Studies'} Found
             </div>
          </div>
          
          {/* THE NEW STACK - Using TrialCardWide */}
          <div className="space-y-4">
            {trials.map((trial) => (
              <TrialCardWide key={trial.id} trial={trial} />
            ))}
          </div>

        </div>
      </section>

      {/* Suggested Trials Footer */}
      {suggestedTrials.length > 0 && (
        <section className="py-20 bg-white border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10">
               <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                 Explore More
               </span>
               <h3 className="mt-2 text-2xl font-bold text-slate-900">
                 Other Studies Near You
               </h3>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 opacity-90 hover:opacity-100 transition-opacity">
              {suggestedTrials.slice(0, 3).map((trial) => (
                <TrialCard key={trial.id} trial={trial} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}