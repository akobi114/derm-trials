"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TrialCardWide from "./TrialCardWide"; 
import { MapPin, Filter } from "lucide-react"; 

// --- STATE DICTIONARY (Abbr -> Full Name) ---
const STATE_MAP: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia"
};

// --- TYPE DEFINITIONS ---
interface TrialLocation {
  zip: string;
  city: string;
  state: string; 
  status: string;
  country: string;
  facility: string;
}

export interface Trial {
  id: string;
  nct_id: string;
  title: string;
  condition: string;
  locations?: TrialLocation[]; 
  location?: string | any; 
  status: string;
  tags: string[];
  simple_title?: string;
  sponsor?: string;
}

interface TrialResultsListProps {
  searchQuery: string;
  zipCode?: string;
  distance?: number;
}

export default function TrialResultsList({ searchQuery, zipCode, distance = 100 }: TrialResultsListProps) {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [userState, setUserState] = useState<string | null>(null);
  const [searchLabel, setSearchLabel] = useState<string>("");

  useEffect(() => {
    async function fetchTrials() {
      setLoading(true);
      setTrials([]);

      try {
        // --- SCENARIO A: ZIP CODE SEARCH ---
        if (zipCode && zipCode.length >= 5) {
          const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
          
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const lat = parseFloat(geoData.places[0].latitude);
            const lon = parseFloat(geoData.places[0].longitude);
            const stateAbbr = geoData.places[0]['state abbreviation']; 
            const cityName = geoData.places[0]['place name']; 

            setUserState(stateAbbr);
            setSearchLabel(`${cityName}, ${stateAbbr}`);

            const { data, error } = await supabase.rpc('get_trials_nearby', {
              lat: lat,
              long: lon,
              miles: distance,
              search_term: searchQuery.trim() || null
            });

            if (!error && data) setTrials(data as any[]);
          } else {
            setUserState(null);
            setSearchLabel("");
            await runTextSearch();
          }

        } else {
          setUserState(null);
          setSearchLabel("");
          await runTextSearch();
        }

      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }

    async function runTextSearch() {
        const { data: allTrials } = await supabase.from('trials').select('*');
        if (!allTrials) return;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = allTrials.filter((trial) => {
                const titleMatch = trial.title.toLowerCase().includes(lowerQuery);
                const conditionMatch = trial.condition.toLowerCase().includes(lowerQuery);
                const tagMatch = trial.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery));
                return titleMatch || conditionMatch || tagMatch;
            });
            setTrials(filtered as any[]);
        } else {
            setTrials(allTrials as any[]);
        }
    }

    fetchTrials();
  }, [searchQuery, zipCode, distance]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 w-full bg-slate-200 rounded-2xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <section className="pb-20">
      <div className="mx-auto max-w-5xl px-6">
        
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Search Results</p>
              <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                {searchQuery ? `Matches for "${searchQuery}"` : "All Active Trials"}
                {searchLabel && (
                    <span className="block text-lg text-slate-500 font-medium mt-1">
                        near {searchLabel} <span className="text-slate-300">|</span> Within {distance} miles
                    </span>
                )}
              </h2>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
              <Filter className="h-4 w-4" />
              {trials.length} {trials.length === 1 ? 'Study' : 'Studies'} Found
            </div>
        </div>
        
        {/* RESULTS LIST */}
        <div className="space-y-4">
          {trials.length > 0 ? (
            trials.map((trial) => {
              
              // --- SMART "MULTI-LOCATION" AGGREGATOR ---
              const displayTrial = { ...trial };
              
              const sitesArray = (Array.isArray(trial.locations) ? trial.locations : 
                                  Array.isArray(trial.location) ? trial.location : []) as TrialLocation[];

              if (userState && sitesArray.length > 0) {
                  const stateAbbr = userState.toUpperCase();
                  const stateFull = STATE_MAP[stateAbbr];

                  // 1. Find ALL matching sites in this state
                  const matches = sitesArray.filter(site => {
                      const s = (site.state || "").trim();
                      return s.toLowerCase() === stateFull?.toLowerCase() || 
                             s.toUpperCase() === stateAbbr;
                  });

                  if (matches.length > 0) {
                      // 2. Get unique city names to avoid "Phoenix, Phoenix"
                      const uniqueCities = Array.from(new Set(matches.map(m => m.city.trim())));
                      const count = uniqueCities.length;
                      
                      // 3. Format the display string based on how many locations exist
                      if (count === 1) {
                        displayTrial.location = `${uniqueCities[0]}, ${matches[0].state}`;
                      } else if (count === 2) {
                        displayTrial.location = `${uniqueCities[0]} & ${uniqueCities[1]}, ${matches[0].state}`;
                      } else {
                        // 3 or more: "Phoenix, Scottsdale (+2 others)"
                        displayTrial.location = `${uniqueCities[0]}, ${uniqueCities[1]} (+${count - 2} others)`;
                      }
                      
                  } else {
                      displayTrial.location = ""; 
                  }
              } else if (sitesArray.length > 0) {
                  // Fallback for non-zip searches
                  displayTrial.location = `${sitesArray[0].city}, ${sitesArray[0].state}`;
              } else {
                  displayTrial.location = ""; 
              }

              return <TrialCardWide key={trial.id} trial={displayTrial} />;
            })
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <MapPin className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No matches found nearby</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn't find any "{searchQuery}" trials within {distance} miles of {zipCode}. 
                <br /><span className="text-xs mt-2 block">Try increasing the distance or searching a different condition.</span>
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}