"use client";

import Link from 'next/link';
import { MapPin, ArrowRight, Share2, ShieldCheck, Building2 } from 'lucide-react';

interface TrialCardProps {
  trial: any;
  featured?: boolean; // Optional prop to manually force premium look
}

export default function TrialCard({ trial, featured = false }: TrialCardProps) {
  
  if (!trial) return null;

  // --- PREMIUM LOGIC ---
  // In the future, this checks: trial.is_claimed === true
  // For now, we simulate it if you pass 'featured' or if specific sponsors exist
  const isPremium = featured || trial.is_verified || (trial.sponsor?.includes("Pfizer") || trial.sponsor?.includes("AbbVie"));

  // --- SHARE LOGIC ---
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/trial/${trial.nct_id}`;
    
    const shareData = {
      title: 'DermTrials Research Opportunity',
      text: `I found a paid clinical trial for ${trial.condition} that might interest you.\n\nStudy: ${trial.title}\nLocation: ${trial.locations?.[0]?.city || 'Phoenix'}, AZ\n\nView details here:`,
      url: shareUrl,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log('Share canceled'); }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === 'recruiting') return { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", glow: true };
    if (s.includes('active')) return { badge: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", glow: false };
    if (s.includes('not yet')) return { badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500", glow: false };
    return { badge: "bg-slate-50 text-slate-600 ring-slate-500/10", dot: "bg-slate-400", glow: false };
  };

  const statusStyle = getStatusColor(trial.status);

  const formatLocation = (loc: string) => {
    if (!loc) return "United States";
    return loc.split(',').slice(0, 2).join(', '); // "Phoenix, AZ"
  };

  return (
    <div className={`
      relative flex flex-col h-full rounded-2xl transition-all duration-300 group
      ${isPremium 
        ? 'bg-white border-2 border-indigo-100 shadow-md hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1' 
        : 'bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 hover:-translate-y-1'
      }
    `}>
      
      {/* PREMIUM BADGE (Floating Top Left) */}
      {isPremium && (
        <div className="absolute -top-3 left-4 z-20 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md ring-2 ring-white">
          <ShieldCheck className="h-3 w-3" /> VERIFIED SITE
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-4 relative z-20">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusStyle.badge}`}>
            <span className={`relative flex h-2 w-2`}>
              {statusStyle.glow && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`}></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle.dot}`}></span>
            </span>
            {trial.status || "Unknown"}
          </span>

          {/* SHARE BUTTON */}
          <button 
            onClick={handleShare}
            className="p-2 -mr-2 -mt-2 rounded-full text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            title="Share this trial"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* TITLE */}
        <h3 className={`text-lg font-bold mb-3 flex-grow transition-colors line-clamp-2 ${isPremium ? 'text-indigo-900 group-hover:text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>
          {trial.simple_title || trial.title || "Untitled Study"}
        </h3>

        {/* METADATA ROW */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4 font-medium">
          <span className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
            {formatLocation(trial.location)}
          </span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span className="uppercase tracking-wide text-slate-400">
            {trial.condition || "Trial"}
          </span>
        </div>

        {/* SPONSOR (If Premium, show prominently) */}
        {isPremium && trial.sponsor && (
          <div className="mb-4 flex items-center gap-2">
            <div className="p-1 bg-indigo-50 rounded text-indigo-600">
              <Building2 className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{trial.sponsor}</span>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className={`
        mt-auto p-4 border-t rounded-b-2xl relative z-20
        ${isPremium ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-50'}
      `}>
        <Link 
          href={`/trial/${trial.nct_id}`} 
          className={`
            flex items-center justify-center w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200
            ${isPremium 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-200' 
              : 'bg-slate-50 text-slate-700 hover:bg-indigo-600 hover:text-white'
            }
          `}
        >
          {isPremium ? "Priority Access" : "View Details"} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* Full Card Background Link */}
      <Link href={`/trial/${trial.nct_id}`} className="absolute inset-0 z-10" aria-label="View trial" />
    </div>
  );
}
