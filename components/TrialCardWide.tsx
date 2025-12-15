"use client";

import Link from 'next/link';
import { MapPin, ArrowRight, Share2, ShieldCheck, Building2, FlaskConical, Stethoscope } from 'lucide-react';

interface TrialCardProps {
  trial: any;
  featured?: boolean;
}

export default function TrialCardWide({ trial, featured = false }: TrialCardProps) {
  
  if (!trial) return null;

  // Premium Logic (Simulated)
  const isPremium = featured || trial.is_verified || (trial.sponsor?.includes("Pfizer") || trial.sponsor?.includes("AbbVie"));

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === 'recruiting') return { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500", label: "Recruiting" };
    if (s.includes('active')) return { badge: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500", label: "Active" };
    if (s.includes('not yet')) return { badge: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500", label: "Coming Soon" };
    return { badge: "bg-slate-50 text-slate-600 border-slate-100", dot: "bg-slate-400", label: status || "Unknown" };
  };

  const statusStyle = getStatusColor(trial.status);

  const formatLocation = (loc: string) => {
    if (!loc) return "United States";
    return loc.split(',').slice(0, 2).join(', '); // "Phoenix, AZ"
  };

  return (
    <div className={`
      relative flex flex-col md:flex-row w-full bg-white rounded-2xl transition-all duration-300 group overflow-hidden
      ${isPremium 
        ? 'border-2 border-indigo-50 shadow-md hover:shadow-xl hover:border-indigo-200' 
        : 'border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100'
      }
    `}>
      
      {/* LEFT VISUAL COLUMN (Hidden on mobile, visible on desktop) */}
      <div className={`
        hidden md:flex w-48 shrink-0 flex-col items-center justify-center p-6 border-r
        ${isPremium ? 'bg-indigo-50/30 border-indigo-50' : 'bg-slate-50/50 border-slate-50'}
      `}>
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-sm
          ${isPremium ? 'bg-white text-indigo-600' : 'bg-white text-slate-400'}
        `}>
           {/* Visual Placeholder: In real app, this could be a Condition Icon */}
           <FlaskConical className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center px-2">
          {trial.condition || "Clinical Study"}
        </span>
      </div>

      {/* MIDDLE CONTENT COLUMN */}
      <div className="flex-1 p-6 flex flex-col justify-center">
        
        <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                {statusStyle.label}
            </span>
            {isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    <ShieldCheck className="h-3 w-3" /> VERIFIED
                </span>
            )}
        </div>

        <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {trial.simple_title || trial.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {formatLocation(trial.location)}
            </span>
            {trial.sponsor && (
                <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {trial.sponsor}
                    </span>
                </>
            )}
        </div>
      </div>

      {/* RIGHT ACTION COLUMN */}
      <div className="p-6 md:w-48 border-t md:border-t-0 md:border-l border-slate-50 flex flex-col justify-center gap-3 bg-slate-50/30">
         <Link 
            href={`/trial/${trial.nct_id}`} 
            className={`
                w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm
                ${isPremium 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                }
            `}
         >
            View Details
         </Link>
         <div className="text-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                 Compensation Available
             </span>
         </div>
      </div>

      {/* Full Card Link Overlay */}
      <Link href={`/trial/${trial.nct_id}`} className="absolute inset-0 z-10" aria-label="View trial details" />
    </div>
  );
}