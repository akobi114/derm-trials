"use client";

import Link from 'next/link';
import { MapPin, Building2, ChevronRight, Activity, FlaskConical, Info, Sparkles, User } from 'lucide-react';
import { getSmartLocationString, calculateDistance } from '@/lib/locationService';

export default function TrialCardWide({ trial, userLat, userLon }: any) {
  // --- 1. SMART LOCATION + ABSOLUTE CLOSEST SITE LOGIC ---
  const rawLocations = Array.isArray(trial.locations) 
    ? trial.locations 
    : typeof trial.locations === 'string' 
      ? JSON.parse(trial.locations || '[]') 
      : [];

  let displayLocation = "Location details unavailable";
  let closestDistance: number | null = null;

  if (rawLocations.length > 0) {
    if (userLat && userLon) {
      // Map all locations to their distances and store their specific city labels
      const locationData = rawLocations.map((loc: any) => {
        const lat = loc.lat || loc.latitude || loc.geoPoint?.lat;
        const lon = loc.long || loc.longitude || loc.geoPoint?.lon;
        const city = loc.city || "Unknown City";
        const state = loc.state || "";
        
        if (!lat || !lon) return { distance: Infinity, label: city };
        
        const dist = calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon));
        return { distance: dist, label: `${city}${state ? `, ${state}` : ''}`.trim() };
      });

      // Sort by distance to find the absolute "winner" (the site closest to the user)
      locationData.sort((a, b) => a.distance - b.distance);
      const closest = locationData[0];

      if (closest.distance !== Infinity) {
        closestDistance = Math.round(closest.distance);
        const otherCount = rawLocations.length - 1;
        
        // Final Output: "Gilbert, AZ (+35 others) • 8 mi away"
        displayLocation = `${closest.label}${otherCount > 0 ? ` (+${otherCount} others)` : ''} • ${closestDistance} mi away`;
      } else {
        // Fallback if coordinates are missing but city names exist
        displayLocation = getSmartLocationString(rawLocations);
      }
    } else {
      // Fallback for nationwide searches (No Zip Code provided)
      displayLocation = getSmartLocationString(rawLocations);
    }
  }

  // --- 2. CLINICAL METADATA LOGIC ---
  const phaseLabel = trial.phase || 'N/A';
  const gender = (trial.gender || "All").toLowerCase();
  const genderLabel = gender === 'all' ? 'All Genders' : gender.charAt(0).toUpperCase() + gender.slice(1);
  const isRecruiting = trial.status?.toLowerCase().includes('recruiting') && !trial.status?.toLowerCase().includes('not');
  const statusColor = isRecruiting ? 'emerald' : 'slate';

  return (
    <Link href={`/trial/${trial.nct_id || trial.id}`} className="block group relative">
      <div className="relative flex flex-col md:flex-row items-stretch bg-white rounded-[20px] border border-slate-200 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-200/60 overflow-hidden group-hover:-translate-y-[2px]">
        
        {/* SIDE ACCENT STRIP */}
        <div className={`absolute left-0 top-0 bottom-0 w-[6px] bg-indigo-500/80 hidden md:block`}></div>

        <div className="flex-1 p-6 md:pl-8 flex flex-col gap-4">
          
          {/* TIER 1: CLINICAL CONTEXT HEADER */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-${statusColor}-50 text-${statusColor}-700 ring-1 ring-${statusColor}-600/10`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${statusColor}-500`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 bg-${statusColor}-500`}></span>
              </span>
              {trial.status || 'Active'}
            </div>

            {phaseLabel !== 'N/A' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <FlaskConical className="h-3 w-3" />
                <span>{phaseLabel}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
              <User className="h-3 w-3" />
              <span>{genderLabel}</span>
            </div>

            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">
              <Activity className="h-3 w-3" /> IRB-Authorized Research
            </span>
          </div>

          {/* TIER 2: STUDY TITLE */}
          <h3 className="text-[19px] font-bold text-slate-900 leading-tight group-hover:text-indigo-700 transition-colors line-clamp-2 pr-4">
            {trial.simple_title || trial.title}
          </h3>

          {/* TIER 3: AI OVERVIEW BLOCK */}
          <div className="py-3.5 px-4 bg-indigo-50/40 rounded-xl border border-indigo-100/50 relative group/ai">
             <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">AI Overview</span>
                
                <div className="relative group/tooltip">
                   <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 leading-tight font-medium text-center">
                      This overview is automatically generated to improve accessibility. Please refer to official study records for final accuracy.
                   </div>
                </div>
             </div>
            
            {/* OPTION B: LINE CLAMP REMOVED TO SHOW FULL SNIPPET */}
            <p className="text-[15px] text-slate-600 leading-relaxed font-medium italic">
              {trial.ai_snippet || `Researching new clinical options for ${trial.condition || 'this condition'}. Click "View Details" to see the study goals, eligibility criteria, and participation requirements.`}
            </p>
          </div>

          {/* TIER 4: LOGISTICS FOOTER */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-slate-500 font-medium border-t border-slate-100 pt-4 mt-auto">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="font-semibold">{displayLocation}</span>
            </div>
            
            <span className="hidden sm:inline text-slate-300">|</span>

            {trial.sponsor && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate max-w-[250px]">{trial.sponsor}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ACTION COLUMN */}
        <div className="hidden md:flex flex-col items-center justify-center px-6 border-l border-slate-100 bg-slate-50/30 shrink-0 group-hover:bg-indigo-50/30 transition-colors">
          <div className="h-14 w-14 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:scale-110 transition-all duration-300">
            <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3 group-hover:text-indigo-600 transition-colors">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}