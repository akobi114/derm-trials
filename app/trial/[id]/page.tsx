import Link from "next/link";
import { ArrowLeft, CheckCircle, MapPin, DollarSign, Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

// Next.js 15: We must use 'await params'
export default async function TrialDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  // FETCH: Get the single trial from Supabase that matches the ID
  const { data: trial } = await supabase
    .from('trials')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  // If Supabase didn't find it, show 404
  if (!trial) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Back Button */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          
          {/* Header Banner */}
          <div className="bg-slate-50 px-8 py-10 border-b border-slate-100">
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {trial.condition}
              </span>
              {trial.status === "Recruiting" && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Recruiting Patients
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {trial.title}
            </h1>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 border-b border-slate-100">
            <div className="p-6 text-center">
              <div className="flex justify-center mb-2"><DollarSign className="h-6 w-6 text-indigo-600" /></div>
              <div className="text-sm font-medium text-slate-500">Compensation</div>
              <div className="text-lg font-bold text-slate-900">{trial.compensation}</div>
            </div>
            <div className="p-6 text-center">
              <div className="flex justify-center mb-2"><MapPin className="h-6 w-6 text-indigo-600" /></div>
              <div className="text-sm font-medium text-slate-500">Location</div>
              <div className="text-lg font-bold text-slate-900">{trial.location}</div>
            </div>
            <div className="p-6 text-center">
              <div className="flex justify-center mb-2"><Calendar className="h-6 w-6 text-indigo-600" /></div>
              <div className="text-sm font-medium text-slate-500">Duration</div>
              <div className="text-lg font-bold text-slate-900">12 Weeks</div>
            </div>
          </div>

          {/* Description & Action */}
          <div className="p-8 sm:p-12">
            <h3 className="text-xl font-bold text-slate-900 mb-4">About this Study</h3>
            <p className="text-lg leading-relaxed text-slate-600 mb-8">
              This clinical research study is evaluating an investigational treatment for {trial.condition}. 
              Qualified participants will receive all study-related care and medication at no cost.
            </p>

            <button className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-1">
              Apply for this Trial
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}