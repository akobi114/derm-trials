"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCard from '@/components/TrialCard';
import TrialCardWide from '@/components/TrialCardWide';
import { Search, MapPin, Sparkles, ArrowLeft, Activity, ChevronRight, HelpCircle, SearchX, Filter } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // --- STATE MANAGEMENT (ALL FEATURES PRESERVED) ---
  const [query, setQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [distance, setDistance] = useState(100);
  const [hasSearched, setHasSearched] = useState(false); 

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  const [featuredTrials, setFeaturedTrials] = useState<any[]>([]);
  const [popularConditions, setPopularConditions] = useState<string[]>([]);

  // Recommendation & Spelling States
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationTitle, setRecommendationTitle] = useState("");
  const [spellingSuggestion, setSpellingSuggestion] = useState<string | null>(null);
  const [searchLabel, setSearchLabel] = useState("");

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    async function getStatsAndFeatured() {
      const { count } = await supabase
        .from('trials')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'recruiting');
      setRecruitingCount(count || 0);

      const { data: featuredData } = await supabase
        .from('trials')
        .select('*')
        .ilike('status', 'recruiting')
        .order('last_updated', { ascending: false })
        .limit(6);
      setFeaturedTrials(featuredData || []);

      const { data: conditionData } = await supabase
        .from('trials')
        .select('condition');
      
      if (conditionData) {
        const unique = Array.from(new Set(conditionData.map(c => c.condition).filter(Boolean))).sort();
        setPopularConditions(unique.slice(0, 4));
      }
    }
    getStatsAndFeatured();
  }, []);

  // --- CORE SEARCH LOGIC (FULLY RESTORED) ---
  const performSearch = async (searchQuery: string, searchZip: string) => {
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setRecommendations([]); 
    setSpellingSuggestion(null);
    setSearchLabel("");

    try {
      let lat = null;
      let lon = null;

      // 1. Convert Zip to Coordinates
      if (searchZip.trim()) {
        const geoRes = await fetch(`https://api.zippopotam.us/us/${searchZip}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          lat = parseFloat(geoData.places[0].latitude);
          lon = parseFloat(geoData.places[0].longitude);
          setSearchLabel(`${geoData.places[0]['place name']}, ${geoData.places[0]['state abbreviation']}`);
        } else {
          alert("Zip Code not found. Searching nationwide.");
        }
      }

      // 2. Primary Search Execution
      let primaryResults: any[] = [];
      const isNationwideSearch = distance >= 500;
      
      if (lat && lon && !isNationwideSearch) {
        const { data, error } = await supabase.rpc('get_trials_nearby', {
          lat,
          long: lon,
          miles: distance,
          search_term: searchQuery.trim() || null
        });
        if (!error) primaryResults = data || [];
      } else {
        const { data, error } = await supabase
          .from('trials')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,condition.ilike.%${searchQuery}%`)
          .limit(50);
        if (!error) primaryResults = data || [];
      }

      setResults(primaryResults);

      // 3. Spelling & Recommendation Engine
      if (primaryResults.length === 0) {
        // Spelling Check
        if (searchQuery.trim().length > 2) {
          const { data: suggestionData } = await supabase.rpc('get_spelling_suggestion', {
            search_term: searchQuery
          });
          if (suggestionData && suggestionData.length > 0) {
            const bestMatch = suggestionData[0].suggestion;
            if (bestMatch.toLowerCase() !== searchQuery.toLowerCase()) {
              setSpellingSuggestion(bestMatch);
            }
          }
        }

        // Recommendations (Fallback Tier 1: Nearby, Fallback Tier 2: Featured)
        let rawRecs: any[] = [];
        if (lat && lon) {
          const { data: nearbyData } = await supabase.rpc('get_trials_nearby', {
            lat, long: lon, miles: distance, search_term: null 
          });
          rawRecs = nearbyData || [];
          setRecommendationTitle(`Active Studies Near ${searchZip}`);
        } else {
          rawRecs = featuredTrials;
          setRecommendationTitle("Latest Recruiting Studies (Nationwide)");
        }
        setRecommendations(rawRecs.slice(0, 6));
      } else {
        // Post-Results Recommendations (Filter out current results)
        const primaryIds = new Set(primaryResults.map(r => r.id));
        let finalRecs: any[] = [];
        let finalTitle = "";

        if (lat && lon) {
          const { data: nearbyData } = await supabase.rpc('get_trials_nearby', {
            lat, long: lon, miles: distance, search_term: null 
          });
          const uniqueNearby = (nearbyData || []).filter((r: any) => !primaryIds.has(r.id));
          if (uniqueNearby.length > 0) {
            finalRecs = uniqueNearby;
            finalTitle = `Other Active Studies Near ${searchZip}`;
          }
        }

        if (finalRecs.length === 0) {
          const uniqueFeatured = featuredTrials.filter(r => !primaryIds.has(r.id));
          if (uniqueFeatured.length > 0) {
            finalRecs = uniqueFeatured;
            finalTitle = "You Might Also Be Interested In";
          }
        }
        setRecommendations(finalRecs.slice(0, 6));
        setRecommendationTitle(finalTitle);
      }
    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, zipCode);
  };

  const clearSearch = () => {
    setHasSearched(false);
    setQuery('');
    setZipCode('');
    setResults([]);
    setSpellingSuggestion(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      {!hasSearched ? (
        // ============================================================
        // VIEW A: PREMIUM HOME PAGE (UNMODIFIED LOGIC)
        // ============================================================
        <>
          <div className="relative bg-white border-b border-slate-100 overflow-hidden">
            <div className="max-w-5xl mx-auto px-6 pt-24 pb-32 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-bold mb-8">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {recruitingCount !== null ? `${recruitingCount} Clinical Trials Currently Recruiting` : "Locating live studies..."}
              </div>

              <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
                Access Tomorrow’s<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Skin Treatments</span>,<br />
                Today.
              </h1>

              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                Find breakthrough clinical research for Psoriasis, Eczema, Acne, and more. Join the exclusive patient community.
              </p>

              <form 
                onSubmit={handleFormSubmit} 
                className="max-w-4xl mx-auto bg-white p-2.5 rounded-3xl md:rounded-full border border-slate-200 shadow-2xl flex flex-col md:flex-row items-center gap-2"
              >
                <div className="relative w-full md:flex-[2] px-6 text-left group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Condition</label>
                    <input type="text" placeholder="e.g. Atopic Dermatitis" className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-lg" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="hidden md:block w-px h-10 bg-slate-100 mx-2"></div>
                <div className="relative w-full md:flex-1 px-6 text-left group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Zip Code</label>
                    <input type="text" placeholder="85001" maxLength={5} className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-lg" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                </div>
                <div className="hidden md:block w-px h-10 bg-slate-100 mx-2"></div>
                <div className="relative w-full md:flex-1 px-6 text-left">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Radius</label>
                    <select className="w-full bg-transparent outline-none text-slate-900 font-bold cursor-pointer text-lg appearance-none" value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
                        <option value="50">50 Miles</option>
                        <option value="100">100 Miles</option>
                        <option value="500">Nationwide</option>
                    </select>
                </div>
                <button type="submit" disabled={loading} className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white font-black rounded-full hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 text-lg shadow-lg">
                  {loading ? 'Searching...' : 'Find Trials'}
                </button>
              </form>
            </div>
          </div>

          {/* RECRUITING CAROUSEL */}
          {featuredTrials.length > 0 && (
            <div className="py-24 border-b border-slate-200 bg-slate-50">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-4 mb-12">
                  <div className="p-3 bg-indigo-100 rounded-2xl shadow-inner"><Sparkles className="h-6 w-6 text-indigo-600" /></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">New & Recruiting</h2>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Recently added dermatological studies</p>
                  </div>
                </div>
                <div className="flex overflow-x-auto gap-8 pb-10 snap-x scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                  {featuredTrials.map((trial) => (<div key={trial.id} className="min-w-[360px] max-w-[360px] snap-center"><TrialCard trial={trial} /></div>))}
                </div>
              </div>
            </div>
          )}

          {/* POPULAR CONDITIONS */}
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Explore by Condition</h2>
                <p className="text-slate-500 mt-2 text-lg font-medium">Common research areas currently recruiting near you.</p>
              </div>
              <Link href="/conditions" className="hidden md:flex items-center gap-2 text-sm font-black text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50 px-6 py-3 rounded-full shadow-sm">
                View All Conditions <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {popularConditions.map((cond) => (
                  <Link key={cond} href={`/condition/${encodeURIComponent(cond)}`} className="group flex items-center justify-between p-8 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-200 hover:shadow-[0_20px_50px_rgba(79,70,229,0.08)] transition-all duration-500">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><Activity className="h-7 w-7" /></div>
                      <span className="font-black text-xl text-slate-800 group-hover:text-slate-900 leading-tight">{cond}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </>
      ) : (
        // ============================================================
        // VIEW B: WORLD-CLASS SEARCH RESULTS (THE LIST VIEW)
        // ============================================================
        <div className="max-w-5xl mx-auto px-6 py-12">
          <button onClick={clearSearch} className="inline-flex items-center text-sm font-black text-slate-400 hover:text-indigo-600 mb-12 transition-colors uppercase tracking-[0.2em]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
          </button>

          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
            <div>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Live Clinical Network</p>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-4">
                    {query ? <span className="capitalize">{query} Trials</span> : "Active Studies"}
                </h1>
                {searchLabel && <p className="text-slate-500 font-bold text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-slate-300" /> Matches near {searchLabel} • {distance} Mi</p>}
            </div>
            
            {!loading && results.length > 0 && (
                <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                    <span className="text-sm font-black text-slate-700 tracking-tight">{results.length} Precision Match Opportunities</span>
                    <Filter className="h-4 w-4 text-slate-300" />
                </div>
            )}
          </div>

          {loading ? (
             <div className="space-y-8 animate-pulse">
                {[1, 2, 3].map((i) => (<div key={i} className="h-64 w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"></div>))}
             </div>
          ) : (
            <div className="space-y-20 pb-20">
              
              {/* SPELLING SUGGESTION */}
              {results.length === 0 && spellingSuggestion && (
                <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] flex items-center gap-5 animate-in fade-in slide-in-from-top-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm"><HelpCircle className="h-6 w-6 text-amber-500" /></div>
                  <div className="text-amber-900 font-black text-xl">
                    Did you mean <button onClick={() => performSearch(spellingSuggestion, zipCode)} className="underline decoration-indigo-600/30 decoration-4 underline-offset-8 hover:text-indigo-600 transition-all">{spellingSuggestion}</button>?
                  </div>
                </div>
              )}

              {/* PRIMARY RESULTS (THE HIGH-END LIST) */}
              <div className="flex flex-col">
                {results.length > 0 ? (
                  results.map((trial) => (<TrialCardWide key={trial.id} trial={trial} />))
                ) : (
                  <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><SearchX className="h-10 w-10 text-slate-200" /></div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">No Matches Found</h3>
                    <p className="text-slate-400 font-medium text-lg max-w-sm mx-auto mb-12 leading-relaxed">We couldn't find an exact trial for "{query}" in this location yet.</p>
                    <button onClick={clearSearch} className="px-12 py-5 bg-slate-950 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all transform hover:-translate-y-1">Start a New Search</button>
                  </div>
                )}
              </div>

              {/* RECOMMENDATIONS SECTION */}
              {recommendations.length > 0 && (
                <div className="pt-24 border-t border-slate-200">
                  <div className="flex items-center gap-5 mb-16">
                    <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-indigo-100/50"><Sparkles className="h-7 w-7" /></div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 leading-tight">{recommendationTitle}</h3>
                      <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em] mt-1">Curated research in your geographical region</p>
                    </div>
                  </div>
                  {/* Keep Recommendations in Grid (TrialCard) for visual variety and "browsing" feel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {recommendations.map((trial) => (<TrialCard key={trial.id} trial={trial} />))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}