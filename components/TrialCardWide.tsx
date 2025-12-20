"use client";

import Link from 'next/link';
import { MapPin, Building2, ChevronRight, ShieldCheck } from 'lucide-react';

export default function TrialCardWide({ trial, userState }: any) {
  if (!trial) return null;

  const isVerified = trial.is_verified || (trial.sponsor?.includes("AbbVie") || trial.sponsor?.includes("Pfizer"));
  const isRecruiting = (trial.status || "").toLowerCase().includes('recruiting');

  return (
    <div className="relative group mb-6">
      {/* NAVIGATION OVERLAY */}
      <Link href={`/trial/${trial.nct_id}`} className="absolute inset-0 z-10" aria-label="View trial" />

      <div className={`
        relative bg-white rounded-3xl border transition-all duration-500 overflow-hidden p-8
        ${isVerified ? 'border-indigo-100 shadow-xl ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm hover:shadow-lg'}
      `}>
        <div className="flex flex-col md:flex-row items-center gap-8 relative">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isRecruiting ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {isRecruiting ? 'Recruiting' : 'Active'}
              </span>
              {isVerified && <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest"><ShieldCheck className="h-3 w-3" /> Verified Site</span>}
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {trial.simple_title || trial.title}
            </h3>

            <div className="flex flex-wrap items-center gap-x-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-indigo-500" /> {trial.location || "Multiple Locations"}</div>
              <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {trial.sponsor}</div>
            </div>
          </div>

          <div className="w-full md:w-auto md:pl-8 md:border-l border-slate-100">
             <div className={`w-full md:w-52 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isVerified ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-white group-hover:bg-indigo-600'}`}>
                {isVerified ? 'Priority Access' : 'View Details'} <ChevronRight className="h-4 w-4" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}