import Navbar from "@/components/Navbar";
import TrialGrid from "@/components/TrialGrid";
import { ArrowLeft, CheckCircle, Stethoscope } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Next.js 15: Async Page Component
export default async function ConditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;

  // 1. FETCH: Ask Supabase for the condition matching the URL (e.g., 'acne')
  const { data: condition } = await supabase
    .from('conditions')
    .select('*')
    .eq('slug', resolvedParams.slug) // .eq means "Equals"
    .single();

  // 2. If the database has no record for this slug, show 404
  if (!condition) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* SEO Header */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Link>
          </div>
          
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-6">
            {condition.title}
          </h1>

          {/* The "Doctor's Desk" Content */}
          <div className="max-w-3xl">
             <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                <Stethoscope className="h-3 w-3" />
                Medical Overview
             </div>
             <p className="text-xl text-slate-600 leading-relaxed">
               {condition.overview_content}
             </p>
          </div>
          
          {/* Symptoms Tags (Pulled from your Array!) */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-900 mb-3">Common Criteria:</p>
            <div className="flex flex-wrap gap-2">
              {condition.symptoms_list && condition.symptoms_list.map((symptom: string) => (
                <span key={symptom} className="flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The Trial Grid - Automatically searches for trials matching this slug */}
      <TrialGrid searchQuery={condition.slug} />
    </main>
  );
}