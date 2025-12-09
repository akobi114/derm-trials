"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCard from '@/components/TrialCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConditionPage() {
  const params = useParams();
  // Decode the slug (e.g. "Acne%20Vulgaris" -> "Acne Vulgaris")
  const condition = decodeURIComponent(params.slug as string);
  
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrials() {
      // 1. Fetch trials matching the condition
      const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('condition', condition);

      if (data) {
        // 2. Custom Sort Logic
        const sorted = data.sort((a, b) => {
          const statusA = (a.status || "").toLowerCase();
          const statusB = (b.status || "").toLowerCase();

          // Priority 1: Recruiting (Green)
          const isRecruitingA = statusA === 'recruiting';
          const isRecruitingB = statusB === 'recruiting';

          if (isRecruitingA && !isRecruitingB) return -1; // A comes first
          if (!isRecruitingA && isRecruitingB) return 1;  // B comes first

          // Priority 2: Not Yet Recruiting (Blue)
          const isFutureA = statusA.includes('not yet');
          const isFutureB = statusB.includes('not yet');

          if (isFutureA && !isFutureB) return -1;
          if (!isFutureA && isFutureB) return 1;

          // Priority 3: Active, Not Recruiting (Amber)
          const isActiveA = statusA.includes('active');
          const isActiveB = statusB.includes('active');

          if (isActiveA && !isActiveB) return -1;
          if (!isActiveA && isActiveB) return 1;

          return 0; // Keep original order if same priority
        });

        setTrials(sorted);
      }
      setLoading(false);
    }

    fetchTrials();
  }, [condition]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{condition} Trials</h1>
          <p className="text-slate-600">
            Found {trials.length} active studies for this condition.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading trials...</div>
        ) : trials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trials.map((trial) => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 mb-4">No active trials found for "{condition}"</p>
            <Link href="/" className="text-indigo-600 font-bold hover:underline">
              Browse all conditions
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}