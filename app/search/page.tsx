"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCardWide from '@/components/TrialCardWide';
import { getZipCoordinates } from '@/lib/locationService';
import { 
  ArrowLeft, Loader2, Sparkles, 
  Search, MapPin, SlidersHorizontal, FlaskConical, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// --- HELPER: LEVENSHTEIN DISTANCE (Fuzzy Match Utility) ---
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

// --- CONDITION MAPPING (Bridges Common Names to Clinical Terms) ---
const POPULAR_CONDITIONS = [
  // --- Inflammatory & Autoimmune ---
  { label: "Acne", search: "Acne", clinical: "Acne Vulgaris" },
  { label: "Rosacea", search: "Rosacea", clinical: "Rosacea" },
  { label: "Eczema", search: "Atopic Dermatitis", clinical: "Atopic Dermatitis" },
  { label: "Psoriasis", search: "Psoriasis", clinical: "Psoriasis Vulgaris" },
  { label: "Hidradenitis Suppurativa", search: "Hidradenitis", clinical: "Hidradenitis Suppurativa" },
  { label: "Plaque Psoriasis", search: "Psoriasis", clinical: "Plaque Psoriasis" },
  { label: "Seborrheic Dermatitis", search: "Seborrheic Dermatitis", clinical: "Dermatitis, Seborrheic" },
  { label: "Contact Dermatitis", search: "Contact Dermatitis", clinical: "Dermatitis, Contact" },
  { label: "Prurigo Nodularis", search: "Prurigo Nodularis", clinical: "Prurigo Nodularis" },
  { label: "Hives", search: "Urticaria", clinical: "Urticaria" },

  // --- Pigmentation & Hair ---
  { label: "Vitiligo", search: "Vitiligo", clinical: "Vitiligo" },
  { label: "Melasma", search: "Melasma", clinical: "Melasma" },
  { label: "Hyperpigmentation", search: "Hyperpigmentation", clinical: "Hyperpigmentation" },
  { label: "Hair Loss", search: "Alopecia", clinical: "Alopecia" },
  { label: "Alopecia Areata", search: "Alopecia Areata", clinical: "Alopecia Areata" },
  { label: "Scalp Psoriasis", search: "Scalp Psoriasis", clinical: "Psoriasis of Scalp" },

  // --- Oncology & Infectious ---
  { label: "Skin Cancer", search: "Melanoma", clinical: "Melanoma" },
  { label: "Basal Cell Carcinoma", search: "BCC", clinical: "Carcinoma, Basal Cell" },
  { label: "Squamous Cell Carcinoma", search: "SCC", clinical: "Carcinoma, Squamous Cell" },
  { label: "Actinic Keratosis", search: "Actinic Keratosis", clinical: "Keratosis, Actinic" },
  { label: "Warts", search: "Verruca", clinical: "Verruca Vulgaris" },
  { label: "Cold Sores", search: "Herpes Simplex", clinical: "Herpes Simplex" },
  { label: "Fungal Infection", search: "Tinea", clinical: "Tinea Pedis/Corporis" },

  // --- Miscellaneous & Chronic ---
  { label: "Chronic Itch", search: "Pruritus", clinical: "Pruritus" },
  { label: "Excessive Sweating", search: "Hyperhidrosis", clinical: "Hyperhidrosis" },
  { label: "Lupus (Skin)", search: "Lupus Erythematosus", clinical: "Cutaneous Lupus Erythematosus" }
];

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryParam = searchParams.get('q') || '';
  const zipParam = searchParams.get('zip') || '';
  const radiusParam = Number(searchParams.get('radius')) || 100;
  const phaseParam = searchParams.get('phase') || 'all';
  const genderParam = searchParams.get('gender') || 'all';

  const [tempQuery, setTempQuery] = useState(queryParam);
  const [tempZip, setTempZip] = useState(zipParam);

  // --- PREDICTIVE SEARCH & SUGGESTION STATE ---
  const [showPredictions, setShowPredictions] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null); // To store "Did you mean?" guess
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lon: number} | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!queryParam.trim() && !zipParam.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setSuggestion(null); // Reset suggestion on new search
      try {
        let lat = null;
        let lon = null;

        if (zipParam.trim()) {
          const coords = await getZipCoordinates(zipParam);
          if (coords) {
            lat = coords.lat;
            lon = coords.lon;
            setUserCoords({ lat, lon });
          }
        }

        // UPDATED: Parameter names now match the prefixed p_ names in SQL
        const { data, error } = await supabase.rpc('get_trials_nearby', {
          p_lat: lat,
          p_long: lon,
          p_miles: radiusParam,
          p_query: queryParam.trim() || null
        });
        
        if (!error && data) {
          const filteredResults = data.filter((t: any) => {
            const trialPhase = (t.phase || "").toLowerCase().trim();
            const selectedPhase = phaseParam.toLowerCase().trim();
            const phaseDigit = selectedPhase.replace(/\D/g, ""); 
            const phaseMatch = phaseParam === 'all' || trialPhase.includes(phaseDigit);

            const trialGender = (t.gender || "all").toLowerCase().trim();
            const selectedGender = genderParam.toLowerCase().trim();
            const genderMatch = selectedGender === 'all' || 
                               trialGender === 'all' || 
                               trialGender === selectedGender;

            return phaseMatch && genderMatch;
          });
          setResults(filteredResults);

          // --- FUZZY MATCH LOGIC: Check for close matches if 0 results ---
          if (filteredResults.length === 0 && queryParam.trim()) {
            let bestMatch = null;
            let minDistance = 3; // Threshold: suggest if only 1-2 letters off

            POPULAR_CONDITIONS.forEach(cond => {
              const d = getLevenshteinDistance(queryParam.toLowerCase(), cond.label.toLowerCase());
              if (d < minDistance) {
                minDistance = d;
                bestMatch = cond;
              }
            });
            if (bestMatch) setSuggestion(bestMatch);
          }
        }
        
        if ((!data || data.length === 0) && lat && lon) {
          // UPDATED: Parameter names now match the prefixed p_ names in SQL
          const { data: recs } = await supabase.rpc('get_trials_nearby', { 
            p_lat: lat, 
            p_long: lon, 
            p_miles: radiusParam, 
            p_query: null 
          });
          setRecommendations(recs?.slice(0, 4) || []);
        }
      } catch (err) {
        console.error("Search Error:", err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [queryParam, zipParam, radiusParam, phaseParam, genderParam]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/search?${params.toString()}`);
  };

  const handleStripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPredictions(false);
    updateFilters({ q: tempQuery, zip: tempZip });
  };

  const handlePredictionSelect = (condition: { label: string, clinical: string, search: string }) => {
    setTempQuery(condition.label);
    setShowPredictions(false);
    updateFilters({ q: condition.search, zip: tempZip });
  };

  const filteredPredictions = tempQuery 
    ? POPULAR_CONDITIONS.filter(c => 
        c.label.toLowerCase().includes(tempQuery.toLowerCase()) || 
        c.clinical.toLowerCase().includes(tempQuery.toLowerCase())
      )
    : POPULAR_CONDITIONS;

  return (
    <div className="flex flex-col gap-8">
      {/* --- TOP SEARCH STRIP --- */}
      <div className="relative z-[60]" ref={dropdownRef}>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-2 flex flex-col md:flex-row items-center gap-2">
          <form onSubmit={handleStripSubmit} className="flex flex-col md:flex-row items-center gap-2 w-full">
            <div className="flex-1 relative flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all">
              <Search className="h-4 w-4 text-slate-400" />
              <input 
                className="bg-transparent outline-none text-sm font-bold text-slate-700 w-full"
                placeholder="Condition (e.g. Eczema)..."
                value={tempQuery}
                onFocus={() => setShowPredictions(true)}
                onChange={(e) => setTempQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all">
              <MapPin className="h-4 w-4 text-slate-400" />
              <input 
                className="bg-transparent outline-none text-sm font-bold text-slate-700 w-full"
                placeholder="Zip Code"
                maxLength={5}
                value={tempZip}
                onChange={(e) => setTempZip(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
              Update Search
            </button>
          </form>
        </div>

        {/* --- PREDICTIVE DROPDOWN --- */}
        <AnimatePresence>
          {showPredictions && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 w-full md:w-2/3 bg-white border border-slate-200 rounded-2xl mt-2 shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {tempQuery ? "Suggested Conditions" : "Popular Research Areas"}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {filteredPredictions.length > 0 ? (
                  filteredPredictions.map((item) => (
                    <button
                      key={item.clinical}
                      type="button"
                      onClick={() => handlePredictionSelect(item)}
                      className="w-full text-left px-6 py-4 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{item.label}</span>
                        <span className="text-[10px] text-slate-400 font-medium italic">{item.clinical}</span>
                      </div>
                      <Sparkles className="h-4 w-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium">
                    No matching conditions found. Try searching for a general term.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* --- LEFT FILTER SIDEBAR --- */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">Refine Results</h3>
            </div>

            <div className="mb-8">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Search Radius</label>
              <div className="space-y-2">
                {[25, 50, 100, 500].map((dist) => (
                  <button 
                    key={dist}
                    onClick={() => updateFilters({ radius: dist.toString() })}
                    className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold border transition-all ${radiusParam === dist ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                  >
                    Within {dist === 500 ? 'Anywhere' : `${dist} Miles`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Study Phase</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
                value={phaseParam}
                onChange={(e) => updateFilters({ phase: e.target.value })}
              >
                <option value="all">All Phases</option>
                <option value="phase 1">Phase 1</option>
                <option value="phase 2">Phase 2</option>
                <option value="phase 3">Phase 3</option>
                <option value="phase 4">Phase 4</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Target Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {['all', 'male', 'female'].map((g) => (
                  <button 
                    key={g}
                    onClick={() => updateFilters({ gender: g })}
                    className={`py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${genderParam === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* --- MAIN RESULTS COLUMN --- */}
        <div className="flex-1 min-w-0">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {(!queryParam && !zipParam) ? "Start Your Search" : "Search Results"} 
              <span className="text-slate-400 font-medium text-lg ml-2">({results.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Matching
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 border-dashed">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-bold text-sm tracking-wide">Syncing Trial Database...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {results.map((trial) => (
                  <TrialCardWide 
                    key={trial.location_id} 
                    trial={trial} 
                    userLat={userCoords?.lat} 
                    userLon={userCoords?.lon} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm px-6">
                {!queryParam && !zipParam ? (
                  <>
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="h-8 w-8 text-indigo-600 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Ready to find a study?</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                      Enter a condition and your Zip Code above to see clinical trials currently looking for participants in your area.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <FlaskConical className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No matching trials found</h3>
                    
                    {/* --- ADDED: "DID YOU MEAN" SUGGESTION UI --- */}
                    {suggestion ? (
                      <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 inline-block animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" /> Did you mean 
                          <button 
                            onClick={() => handlePredictionSelect(suggestion)}
                            className="text-indigo-600 underline hover:text-indigo-800 transition-colors"
                          >
                            {suggestion.label}
                          </button>?
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10 leading-relaxed">
                        We found no exact matches for <span className="text-indigo-600 font-bold">"{queryParam}"</span> with your current filters. Try expanding your search radius or clearing filters.
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={() => updateFilters({ phase: 'all', gender: 'all' })}
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
                      >
                        Reset Sub-Filters
                      </button>
                      <button 
                        onClick={() => router.push(`/search?q=${queryParam}&zip=${zipParam}&radius=500&phase=all&gender=all`)}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700 transition-all"
                      >
                        Search Nationwide
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading && results.length === 0 && recommendations.length > 0 && (
              <div className="pt-10">
                <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <p className="font-bold text-sm text-indigo-900 uppercase tracking-wider">Studies Recruiting Near You</p>
                </div>
                <div className="flex flex-col gap-4 opacity-75">
                  {recommendations.map((trial) => (
                    <TrialCardWide key={trial.location_id} trial={trial} userLat={userCoords?.lat} userLon={userCoords?.lon} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-10">
        <Suspense fallback={<div className="text-center py-20 text-slate-400 font-bold">Initializing Search Engine...</div>}>
          <SearchResultsContent />
        </Suspense>
      </main>
    </div>
  );
}