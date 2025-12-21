"use client";

import Link from 'next/link';
import { MapPin, ArrowRight, Share2 } from 'lucide-react';

interface TrialCardProps {
  trial: any;
}

export default function TrialCard({ trial }: TrialCardProps) {
  
  if (!trial) return null;

  // --- SHARE LOGIC ---
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop the card click from navigating
    e.stopPropagation();

    // Safely get the origin (domain name)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/trial/${trial.nct_id}`;
    
    const shareData = {
      title: 'DermTrials Research Opportunity',
      text: `I found a paid clinical trial for ${trial.condition} that might interest you.\n\nStudy: ${trial.title}\nLocation: ${trial.locations?.[0]?.city || 'Phoenix'}, AZ\n\nView details here:`,
      url: shareUrl,
    };

    // Use Native Share (Mobile) or Fallback to Clipboard (Desktop)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

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
      <div className="flex justify-between items-start mb-4 relative z-20">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusStyle.badge}`}>
          <span className={`relative flex h-2 w-2`}>
            {statusStyle.glow && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`}></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle.dot}`}></span>
          </span>
          {trial.status || "Unknown"}
        </span>

        {/* SHARE BUTTON (Added z-20 to sit above the full card link) */}
        <button 
          onClick={handleShare}
          className="p-2 -mr-2 -mt-2 rounded-full text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          title="Share this trial"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* TITLE */}
      <h3 className="text-lg font-bold text-slate-900 mb-3 flex-grow group-hover:text-indigo-600 transition-colors">
        {trial.simple_title || trial.title || "Untitled Study"}
      </h3>

      {/* LOCATION & CONDITION */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-6 font-medium">
        <span className="flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
          {formatLocation(trial.location)}
        </span>
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        <span className="uppercase tracking-wide text-slate-400">
          {trial.condition || "Trial"}
        </span>
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-4 border-t border-slate-50 relative z-20">
        <Link 
          href={`/trial/${trial.nct_id}`} 
          className="flex items-center justify-center w-full py-2.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all duration-200"
        >
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* Full Card Click Overlay (Background Link) */}
      <Link href={`/trial/${trial.nct_id}`} className="absolute inset-0 z-10" aria-label="View trial" />
    </div>
  );
}