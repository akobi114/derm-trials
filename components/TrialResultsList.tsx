"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TrialCardWide from "./TrialCardWide"; 
import { MapPin, Filter } from "lucide-react"; 
import { calculateDistance } from "@/lib/locationService"; // Ensure this helper is imported

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
  lat?: string; 
  long?: string; 
  geoPoint?: { lat: number; lon: number };
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
  phase?: string; 
  gender?: string; 
  // --- NEW FIELDS FOR SITE-CENTRIC MODEL ---
  specificLocation?: TrialLocation;
  claimingClinic?: string | null;
  isBranded?: boolean;
  displaySummary?: string;
  dist_miles?: number; // Added to capture DB-calculated distance
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
  const [userCoords, setUserCoords] = useState<{lat: number, lon: number} | null>(null);

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

            setUserCoords({ lat, lon });
            setUserState(stateAbbr);
            setSearchLabel(`${cityName}, ${stateAbbr}`);

            // UPDATED: Use the site-centric 'search_trial_locations' RPC
            const { data, error } = await supabase.rpc('search_trial_locations', {
              user_lat: lat,
              user_lon: lon,
              radius_miles: distance,
              search_term: searchQuery.trim() || null
            });

            if (!error && data) {
                await processLocationExpansion(data as any[], lat, lon);
            } else if (error) {
                console.error("RPC Error:", error.message);
            }
          } else {
            setUserState(null);
            setSearchLabel("");
            setUserCoords(null);
            await runTextSearch();
          }

        } else {
          setUserState(null);
          setSearchLabel("");
          setUserCoords(null);
          await runTextSearch();
        }

      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }

    // --- HELPER: LOCATION-BASED ROW EXPANSION ENGINE (Surgically Updated for DB-driven mapping) ---
    async function processLocationExpansion(rawSites: any[], lat?: number, lon?: number) {
        // 1. Fetch ALL approved claims to cross-reference clinic names
        const { data: allClaims } = await supabase
            .from('claimed_trials')
            .select('*, organizations(name)')
            .eq('status', 'approved');

        // 2. Map the DB results into the Trial interface
        // This processes the expanded rows provided by the database function
        const finalSites = rawSites.map((item: any, idx: number) => {
            const siteStatus = (item.site_status || "").toLowerCase();
            
            // --- WITHDRAWN SUPPRESSION ---
            if (siteStatus === 'withdrawn' || siteStatus === 'suspended' || siteStatus === 'terminated') {
                return null;
            }

            // 3. Cross-reference for Branded Claims
            // Matches against the facility and city to identify if a specific site is "Claimed"
            const claim = allClaims?.find(c => 
                c.nct_id === item.nct_id && 
                c.site_location?.city?.toLowerCase().trim() === (item.city || "").toLowerCase().trim() &&
                c.site_location?.facility?.toLowerCase().trim() === (item.facility_name || "").toLowerCase().trim()
            );

            // 4. Construct the Site-Specific Trial Object
            return {
                ...item,
                // UPDATED: Use item.location_id (the stable DB primary key) instead of a synthetic string
                // This ensures the unique location is locked when navigating to the trial page
                id: item.location_id || `${item.nct_id}-${item.facility_name || item.city}-${idx}`, 
                specificLocation: {
                    city: item.city,
                    state: item.state,
                    facility: item.facility_name,
                    zip: item.zip_code,
                    status: item.site_status,
                    geoPoint: { lat: item.lat, lon: item.lon }
                },
                claimingClinic: claim?.organizations?.name || null,
                isBranded: !!claim,
                // Use the distance provided directly by the database logic
                dist_miles: item.dist_miles,
                displaySummary: claim?.custom_brief_summary || item.ai_snippet || item.simple_summary
            };
        }).filter(Boolean); // Remove suppressed sites

        setTrials(finalSites);
    }

    async function runTextSearch() {
        // Fallback for searches without a ZIP code
        // We still use the RPC but pass null coordinates to get a text-only match
        const { data, error } = await supabase.rpc('search_trial_locations', {
          user_lat: null,
          user_lon: null,
          radius_miles: null,
          search_term: searchQuery.trim() || null
        });

        if (!error && data) {
            await processLocationExpansion(data as any[]);
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
              {trials.length} {trials.length === 1 ? 'Site' : 'Sites'} Found
            </div>
        </div>
        
        {/* RESULTS LIST */}
        <div className="space-y-4">
          {trials.length > 0 ? (
            trials.map((trial) => {
              // The card now receives specific coordinates to show accurate mileage
              return (
                <TrialCardWide 
                  key={trial.id} 
                  trial={trial} 
                  userLat={userCoords?.lat} 
                  userLon={userCoords?.lon} 
                />
              );
            })
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <MapPin className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No active matches found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn't find any recruiting "{searchQuery}" trials within {distance} miles of {zipCode}. 
                <br /><span className="text-xs mt-2 block">Inactive or withdrawn locations are hidden from search.</span>
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}