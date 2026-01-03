"use client";

import Link from 'next/link';
import { 
  MapPin, Building2, ChevronRight, Activity, FlaskConical, 
  Info, Sparkles, User, ShieldCheck 
} from 'lucide-react';
import { getSmartLocationString, calculateDistance } from '@/lib/locationService';

export default function TrialCardWide({ trial, userLat, userLon }: any) {
  // --- 1. RESOLVE SITE-SPECIFIC DATA (NEW) ---
  // These props are injected by the location_based Row expansion logic in TrialResultsList.tsx
  const loc = trial.specificLocation;
  const clinicName = trial.claimingClinic;
  const isBranded = trial.isBranded;
  const displaySummary = trial.displaySummary;

  // --- 2. LOCATION RESOLUTION LOGIC (UPDATED FOR CLINIC-FIRST) ---
  let displayLocation = "Location details unavailable";
  let closestDistance: number | null = null;

  if (trial.city && trial.state) {
    // FLATTENED MODE: Prioritize the city/state sent directly from the Search RPC
    displayLocation = `${trial.city}, ${trial.state}`;
    
    // Calculate distance using the top-level coordinates from the RPC
    if (userLat && userLon && trial.latitude && trial.longitude) {
        const dist = calculateDistance(userLat, userLon, trial.latitude, trial.longitude);
        displayLocation += ` • ${Math.round(dist)} mi away`;
    }
  } else if (loc) {
    // SITE-CENTRIC MODE: Show the exact location this specific card represents
    displayLocation = `${loc.city}, ${loc.state}`;
    
    // Calculate distance for this specific site if coordinates are available
    const lat = loc.lat || loc.latitude || loc.geoPoint?.lat;
    const lon = loc.long || loc.longitude || loc.geoPoint?.lon;
    
    if (userLat && userLon && lat && lon) {
        const dist = calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon));
        displayLocation += ` • ${Math.round(dist)} mi away`;
    }
  } else {
    // TRIAL-CENTRIC FALLBACK: Original closest-site logic (for homepage/featured lists)
    const rawLocations = Array.isArray(trial.locations) 
      ? trial.locations 
      : typeof trial.locations === 'string' 
        ? JSON.parse(trial.locations || '[]') 
        : [];

    if (rawLocations.length > 0) {
      if (userLat && userLon) {
        const locationData = rawLocations.map((l: any) => {
          const lat = l.lat || l.latitude || l.geoPoint?.lat;
          const lon = l.long || l.longitude || l.geoPoint?.lon;
          if (!lat || !lon) return { distance: Infinity, label: l.city };
          const dist = calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon));
          return { distance: dist, label: `${l.city}${l.state ? `, ${l.state}` : ''}`.trim() };
        });
        locationData.sort((a: any, b: any) => a.distance - b.distance);
        const closest = locationData[0];
        if (closest.distance !== Infinity) {
          closestDistance = Math.round(closest.distance);
          displayLocation = `${closest.label}${rawLocations.length > 1 ? ` (+${rawLocations.length - 1} others)` : ''} • ${closestDistance} mi away`;
        } else {
          displayLocation = getSmartLocationString(rawLocations);
        }
      } else {
        displayLocation = getSmartLocationString(rawLocations);
      }
    }
  }

  // --- 3. CLINICAL METADATA LOGIC ---
  const phaseLabel = trial.phase || 'N/A';
  const gender = (trial.gender || "All").toLowerCase();
  const genderLabel = gender === 'all' ? 'All Genders' : gender.charAt(0).toUpperCase() + gender.slice(1);
  const isRecruiting = trial.status?.toLowerCase().includes('recruiting') && !trial.status?.toLowerCase().includes('not');
  const statusColor = isRecruiting ? 'emerald' : 'slate';

  // --- 4. CONSTRUCT DEEP LINK (UPDATED) ---
  // We now use the unique location_id as the primary identifier in the URL.
  // This is much cleaner than facility names and avoids encoding issues.
  const detailUrl = `/trial/${trial.nct_id || trial.id}${trial.location_id ? `?location=${trial.location_id}` : ''}`;

  return (
    <Link href={detailUrl} className="block group relative">
      <div className={`relative flex flex-col md:flex-row items-stretch bg-white rounded-[20px] border transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden group-hover:-translate-y-[2px] ${isBranded ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-slate-200'}`}>
        
        {/* SIDE ACCENT STRIP */}
        <div className={`absolute left-0 top-0 bottom-0 w-[6px] hidden md:block ${isBranded ? 'bg-indigo-600' : 'bg-indigo-500/80'}`}></div>

        <div className="flex-1 p-6 md:pl-8 flex flex-col gap-4">
          
          {/* TIER 1: CLINICAL CONTEXT HEADER */}
          <div className="flex flex-wrap items-center gap-2">
            {isBranded ? (
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                 <ShieldCheck className="h-3.5 w-3.5" />
                 Verified Clinic Site
               </div>
            ) : (
               <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-${statusColor}-50 text-${statusColor}-700 ring-1 ring-${statusColor}-600/10`}>
                 <span className="relative flex h-2 w-2">
                   <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${statusColor}-500`}></span>
                   <span className={`relative inline-flex rounded-full h-2 w-2 bg-${statusColor}-500`}></span>
                 </span>
                 {trial.status || 'Active'}
               </div>
            )}

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
          <div className={`py-3.5 px-4 rounded-xl border relative group/ai ${isBranded ? 'bg-indigo-50/40 border-indigo-100/50' : 'bg-slate-50/50 border-slate-100'}`}>
             <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className={`h-3.5 w-3.5 ${isBranded ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className={`text-[11px] font-black uppercase tracking-wider ${isBranded ? 'text-indigo-700' : 'text-slate-500'}`}>
                    {isBranded ? "Clinic Site Summary" : "AI Research Overview"}
                </span>
                
                <div className="relative group/tooltip">
                   <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 leading-tight font-medium text-center">
                      This overview is generated to improve accessibility. Please refer to official study records for final accuracy.
                   </div>
                </div>
             </div>
            
            <p className="text-[15px] text-slate-600 leading-relaxed font-medium italic">
              {displaySummary || trial.ai_snippet || `Researching clinical options for ${trial.condition || 'this condition'}. Click "View Details" to see the study goals and eligibility.`}
            </p>
          </div>

          {/* TIER 4: LOGISTICS FOOTER */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-slate-500 font-medium border-t border-slate-100 pt-4 mt-auto">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 leading-tight">{displayLocation}</span>
              </div>
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
        <div className={`hidden md:flex flex-col items-center justify-center px-6 border-l shrink-0 transition-colors ${isBranded ? 'bg-indigo-50/30 border-indigo-100' : 'border-slate-100 bg-slate-50/30'} group-hover:bg-indigo-50/30`}>
          <div className={`h-14 w-14 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all duration-300 ${isBranded ? 'border-indigo-200 text-indigo-600 group-hover:scale-110' : 'border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:scale-110'}`}>
            <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest mt-3 transition-colors ${isBranded ? 'text-indigo-600' : 'text-slate-400'} group-hover:text-indigo-600`}>
            View Site
          </span>
        </div>
      </div>
    </Link>
  );
}