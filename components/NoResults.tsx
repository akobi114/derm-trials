"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BellRing, Check } from "lucide-react";
import TrialCard from "./TrialCard";
import type { Trial } from "./TrialResultsList"; // Import the type

export default function NoResults({ query, suggestedTrials }: { query: string, suggestedTrials: Trial[] }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  // Silent Logger
  useEffect(() => {
    if (query) {
      supabase.from("search_logs").insert({ term: query, results_count: 0 });
    }
  }, [query]);

  const handleJoin = async () => {
    if (!email) return;
    setStatus("loading");
    
    const { error } = await supabase.from("waitlist").insert({
      email,
      condition: query, 
    });

    if (!error) setStatus("success");
  };

  return (
    <div className="flex flex-col gap-12">
      
      {/* SECTION 1: The Waitlist Form */}
      <div className="mx-auto max-w-lg text-center py-16">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <BellRing className="h-8 w-8 text-slate-400" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900">
          No active trials for "{query}" yet.
        </h3>
        <p className="mt-2 text-slate-600">
          New studies open every week. Join the waitlist to get notified instantly when a {query} trial opens near you.
        </p>

        {status === "success" ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-4 text-emerald-700 font-medium">
            <Check className="h-5 w-5" />
            You're on the list!
          </div>
        ) : (
          <div className="mt-8 flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleJoin}
              disabled={status === "loading"}
              className="whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === "loading" ? "..." : "Notify Me"}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: The "While you're here" Suggestions */}
      {suggestedTrials.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <h4 className="mb-8 text-lg font-bold text-slate-900">
              Other Active Trials Near You
            </h4>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {suggestedTrials.map((trial) => (
                <TrialCard key={trial.id} trial={trial} />
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}