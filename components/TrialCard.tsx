import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';

interface TrialCardProps {
  trial: any;
}

export default function TrialCard({ trial }: TrialCardProps) {
  
  if (!trial) return null;

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    
    // Green (Recruiting)
    if (s === 'recruiting') {
      return { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", glow: true };
    }
    // Amber (Active, not recruiting)
    if (s.includes('active') && s.includes('not')) {
      return { badge: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", glow: false };
    }
    // Blue (Not yet recruiting)
    if (s.includes('not yet')) {
      return { badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500", glow: false };
    }
    // Gray (Default)
    return { badge: "bg-slate-50 text-slate-600 ring-slate-500/10", dot: "bg-slate-400", glow: false };
  };

  const statusStyle = getStatusColor(trial.status);

  // Helper for location display
  const formatLocation = (loc: string) => {
    if (!loc) return "United States";
    return loc.split(',').slice(0, 2).join(', ');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all duration-300 flex flex-col h-full group relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusStyle.badge}`}>
          <span className={`relative flex h-2 w-2`}>
            {statusStyle.glow && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`}></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle.dot}`}></span>
          </span>
          {trial.status || "Unknown"}
        </span>

        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-md">
          {trial.condition || "Trial"}
        </span>
      </div>

      {/* TITLE - Removed 'line-clamp-2' so it expands fully */}
      <h3 className="text-lg font-bold text-slate-900 mb-3 flex-grow group-hover:text-indigo-600 transition-colors">
        {trial.simple_title || trial.title || "Untitled Study"}
      </h3>

      {/* LOCATION */}
      <div className="flex items-center text-slate-500 text-sm mb-6">
        <MapPin className="h-4 w-4 mr-1.5 text-slate-400" />
        {formatLocation(trial.location)}
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-4 border-t border-slate-50">
        <Link 
          href={`/trial/${trial.nct_id}`} 
          className="flex items-center justify-center w-full py-2.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all duration-200"
        >
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* Full Card Click Overlay */}
      <Link href={`/trial/${trial.nct_id}`} className="absolute inset-0 z-10" aria-label="View trial" />
    </div>
  );
}