import { MapPin, DollarSign, ArrowRight } from "lucide-react";
import { Trial } from "@/lib/mockData";

export default function TrialCard({ trial }: { trial: Trial }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
      
      {/* Header: Condition & Status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
          {trial.condition}
        </div>
        
        {/* Animated Status Pulse */}
        {trial.status === "Recruiting" && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-600">Recruiting</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-3 text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
        {trial.title}
      </h3>

      <div className="mt-auto space-y-3">
        {/* Details */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="h-4 w-4 text-slate-400" />
          {trial.location}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          {trial.compensation}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {trial.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-medium text-slate-400 border border-slate-100 px-2 py-1 rounded-md bg-slate-50">
              {tag}
            </span>
          ))}
        </div>

        {/* Button */}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-600">
          View Details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}