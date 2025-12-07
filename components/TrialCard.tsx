"use client";

import { ArrowRight, MapPin, DollarSign, Share2, Check, Mail } from "lucide-react";
import { useState } from "react";
import Link from "next/link"; // IMPORTED LINK
import type { Trial } from "./TrialGrid";

export default function TrialCard({ trial }: { trial: Trial }) {
  const [copied, setCopied] = useState(false);

  // 1. Handle "Share"
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    const shareData = {
      title: trial.title,
      text: `Found this clinical trial for ${trial.condition} in ${trial.location}. Check it out:`,
      url: window.location.href, 
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share canceled");
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    }
  };

  // 2. Handle "Email"
  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const subject = encodeURIComponent(`Clinical Trial Opportunity: ${trial.title}`);
    const body = encodeURIComponent(
      `I found this clinical trial for ${trial.condition} in ${trial.location} that might be a good fit.\n\n` +
      `Trial: ${trial.title}\n` +
      `Compensation: ${trial.compensation}\n\n` +
      `Link: ${window.location.href}`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="group relative flex flex-col justify-between h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-indigo-100">
      
      {/* HEADER: Condition Badge (Left) + Recruiting Status (Right) */}
      <div className="mb-5 flex items-start justify-between">
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
          {trial.condition.replace(/-/g, " ")}
        </span>
        
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-700">Recruiting</span>
        </div>
      </div>

      {/* TITLE & INFO */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 leading-tight">
          {trial.title}
        </h3>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <span>{trial.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span>{trial.compensation}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {trial.tags?.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* FOOTER: Actions Row */}
      <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
        
        {/* View Details Button (NOW A LINK) */}
        {/* Uses trial.id to link to a unique page */}
        <Link 
          href={`/trial/${trial.id}`} 
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Share Actions (Secondary) */}
        <div className="flex gap-1 border-l border-slate-200 pl-3">
            <button
                onClick={handleEmail}
                className="rounded-full p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                title="Email this trial"
            >
                <Mail className="h-4 w-4" />
            </button>
            <button
                onClick={handleShare}
                className="rounded-full p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                title="Share this trial"
            >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            </button>
        </div>

      </div>
    </div>
  );
}