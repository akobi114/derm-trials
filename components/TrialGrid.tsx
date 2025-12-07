"use client"; // Client-side for now to keep it simple

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TrialCard from "./TrialCard";

// Define what a Trial looks like in the DB
interface Trial {
  id: string;
  title: string;
  condition: string;
  location: string;
  compensation: string;
  status: "Recruiting" | "Full"; // Cast string to union type if needed
  tags: string[];
}

export default function TrialGrid({ searchQuery }: { searchQuery: string }) {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrials() {
      setLoading(true);

      let query = supabase.from('trials').select('*');

      if (searchQuery) {
        // Simple search: checks if condition matches
        query = query.ilike('condition', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (data) {
        // Supabase returns 'status' as string, but our card expects specific text.
        // In a real app we'd validate this. For now, we cast it.
        setTrials(data as unknown as Trial[]);
      }
      setLoading(false);
    }

    fetchTrials();
  }, [searchQuery]);

  if (loading) return <div className="text-center py-20">Loading trials...</div>;

  return (
    <section className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-3xl font-bold mb-12">Featured Opportunities</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {trials.map((trial) => (
            <TrialCard key={trial.id} trial={trial} />
          ))}
        </div>
      </div>
    </section>
  );
}