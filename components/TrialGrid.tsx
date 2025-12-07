"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import TrialCard from "./TrialCard";
import NoResults from "./NoResults"; 
import { ChevronLeft, ChevronRight, Sparkles, Search } from "lucide-react"; 

export interface Trial {
  id: string;
  title: string;
  condition: string;
  location: string;
  compensation: string;
  status: string;
  tags: string[];
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
          // Suggestions are everything else
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

  if (loading) return <div className="text-center py-20 text-slate-400">Loading trials...</div>;

  // CASE 1: No matches found
  if (trials.length === 0 && searchQuery) {
    return <NoResults query={searchQuery} suggestedTrials={suggestedTrials} />;
  }

  // CASE 2: Homepage (Netflix Carousel Mode) - CLEAN WHITE
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
          
          {/* THE CAROUSEL CONTAINER */}
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

  // CASE 3: Search Results (Grid Layout)
  return (
    <>
      <section className="py-16 bg-white min-h-[400px]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Search className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Matches for "{searchQuery}"
                </h2>
                <p className="text-slate-500">We found {trials.length} study matching your criteria.</p>
             </div>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {trials.map((trial) => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </div>
        </div>
      </section>

      {/* Suggested Trials */}
      {suggestedTrials.length > 0 && (
        <section className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10">
               <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                 More Opportunities
               </span>
               <h3 className="mt-2 text-2xl font-bold text-slate-900">
                 Explore Nearby Studies
               </h3>
               <p className="mt-2 text-slate-600 max-w-2xl">
                 These trials are currently recruiting in your area for other conditions.
               </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 opacity-90 hover:opacity-100 transition-opacity">
              {suggestedTrials.map((trial) => (
                <TrialCard key={trial.id} trial={trial} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}