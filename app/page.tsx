"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCard from '@/components/TrialCard';
import { Search, MapPin, Sparkles, Globe, ShieldCheck, ArrowRight, ArrowLeft, Activity, ChevronRight, User, Star } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // --- STATES ---
  const [query, setQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [distance, setDistance] = useState(100);
  const [hasSearched, setHasSearched] = useState(false); 

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  const [featuredTrials, setFeaturedTrials] = useState<any[]>([]);
  const [popularConditions, setPopularConditions] = useState<string[]>([]);

  // New States for "Smart Recommendations"
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationTitle, setRecommendationTitle] = useState("");

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    async function getStatsAndFeatured() {
      // 1. Get Count
      const { count } = await supabase
        .from('trials')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'recruiting');
      setRecruitingCount(count || 0);

      // 2. Get Featured Carousel
      const { data: featuredData } = await supabase
        .from('trials')
        .select('*')
        .ilike('status', 'recruiting')
        .order('last_updated', { ascending: false })
        .limit(6);
      setFeaturedTrials(featuredData || []);

      // 3. Get Popular Conditions
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

  // --- SEARCH HANDLER ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() && !zipCode.trim()) return;
    if (zipCode.trim() && zipCode.trim().length < 5) {
      alert("Please enter a valid 5-digit Zip Code.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setRecommendations([]); // Reset backups

    try {
      let lat = null;
      let lon = null;

      // 1. Get Coordinates
      if (zipCode.trim()) {
        const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          lat = parseFloat(geoData.places[0].latitude);
          lon = parseFloat(geoData.places[0].longitude);
        } else {
          alert("Zip Code not found. Searching by text only.");
        }
      }

      // 2. Perform Primary Search
      let primaryResults: any[] = [];
      
      if (lat && lon) {
        const { data, error } = await supabase.rpc('get_trials_nearby', {
          lat,
          long: lon,
          miles: distance,
          search_term: query.trim() || null
        });
        if (error) console.error(error);
        primaryResults = data || [];
      } else {
        const { data, error } = await supabase
          .from('trials')
          .select('*')
          .or(`title.ilike.%${query}%,condition.ilike.%${query}%`)
          .limit(50);
        if (error) console.error(error);
        primaryResults = data || [];
      }

      setResults(primaryResults);

      // 3. SMART FALLBACK LOGIC
      // If we found nothing (or very few results), fetch recommendations
      if (primaryResults.length === 0) {
        if (lat && lon) {
          // Scenario A: User gave a Zip. Show EVERYTHING near that Zip.
          const { data: nearbyData } = await supabase.rpc('get_trials_nearby', {
            lat,
            long: lon,
            miles: distance,
            search_term: null // Null search term returns ALL trials in range
          });
          
          if (nearbyData && nearbyData.length > 0) {
            setRecommendations(nearbyData);
            setRecommendationTitle(`Other Active Studies Near ${zipCode}`);
          } else {
            // If even nearby is empty, show National Featured
            setRecommendations(featuredTrials);
            setRecommendationTitle("New & Recruiting Studies (Nationwide)");
          }
        } else {
          // Scenario B: No Zip provided. Show National Featured.
          setRecommendations(featuredTrials);
          setRecommendationTitle("Other Active Studies You Might Know Someone For");
        }
      }

    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setHasSearched(false);
    setQuery('');
    setZipCode('');
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      {!hasSearched ? (
        // ============================================================
        // VIEW A: HOME PAGE
        // ============================================================
        <>
          {/* HERO */}
          <div className="relative bg-white border-b border-slate-100 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
            <div className="absolute top-[-100px] right-0 w-[500px] h-[500px] bg-emerald-50/40 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

            <div className="max-w-5xl mx-auto px-6 pt-24 pb-32 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {recruitingCount !== null ? `${recruitingCount} Active Studies Recruiting` : "Locating studies..."}
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                Access Tomorrow’s<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Dermatology Treatments</span>,<br />
                Today.
              </h1>

              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                Join the exclusive community matching patients with breakthrough skin research. Find paid trials for Psoriasis, Eczema, Acne, and more.
              </p>

              <form 
                onSubmit={handleSearch} 
                className="max-w-4xl mx-auto bg-white p-2 rounded-3xl md:rounded-full border border-slate-200 shadow-2xl shadow-indigo-100/50 flex flex-col md:flex-row items-center gap-2 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300"
              >
                {/* Input 1 */}
                <div className="relative w-full md:flex-[2] px-4 group">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-full text-slate-400 group-focus-within:text-indigo-600 group-focus-within:bg-indigo-50 transition-colors">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Condition</label>
                      <input type="text" placeholder="e.g. Atopic Dermatitis" className="w-full bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-300 text-base" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-slate-100 mx-1"></div>
                {/* Input 2 */}
                <div className="relative w-full md:flex-1 px-4 group border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-full text-slate-400 group-focus-within:text-indigo-600 group-focus-within:bg-indigo-50 transition-colors">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Zip Code</label>
                      <input type="text" placeholder="e.g. 85001" maxLength={5} className="w-full bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-300 text-base" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-slate-100 mx-1"></div>
                {/* Input 3 */}
                <div className="relative w-full md:flex-1 px-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 pb-3 md:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Distance</label>
                      <select className="w-full bg-transparent outline-none text-slate-900 font-medium cursor-pointer text-base" value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
                        <option value="25">Within 25 Mi</option>
                        <option value="50">Within 50 Mi</option>
                        <option value="100">Within 100 Mi</option>
                        <option value="500">Anywhere</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 text-base shadow-md">
                  {loading ? '...' : 'Search'}
                </button>
              </form>
            </div>
          </div>

          {/* CAROUSEL */}
          {featuredTrials.length > 0 && (
            <div className="py-16 border-b border-slate-200 bg-slate-50">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-100 rounded-lg"><Sparkles className="h-5 w-5 text-indigo-600" /></div>
                  <h2 className="text-2xl font-bold text-slate-900">New & Recruiting</h2>
                </div>
                <div className="flex overflow-x-auto gap-6 pb-8 snap-x scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
                  {featuredTrials.map((trial) => (<div key={trial.id} className="min-w-[340px] max-w-[340px] snap-center"><TrialCard trial={trial} /></div>))}
                </div>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Explore by Condition</h2>
                <p className="text-slate-500 mt-2 text-lg">Common research areas recruiting near you.</p>
              </div>
              <Link href="/conditions" className="hidden md:flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2 rounded-full">
                View Directory <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {popularConditions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularConditions.map((cond) => (
                  <Link key={cond} href={`/condition/${encodeURIComponent(cond)}`} className="group flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Activity className="h-6 w-6" /></div>
                      <span className="font-bold text-lg text-slate-700 group-hover:text-slate-900">{cond}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">Loading popular conditions...</div>}
            <div className="mt-8 md:hidden"><Link href="/conditions" className="flex items-center justify-center w-full py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">View Directory</Link></div>
          </div>
        </>
      ) : (
        // ============================================================
        // VIEW B: SEARCH RESULTS PAGE
        // ============================================================
        <div className="max-w-7xl mx-auto px-6 py-10">
          <button onClick={clearSearch} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </button>

          <div className="mb-10 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Search Results</h1>
            <p className="text-slate-600 text-lg">
              {loading 
                ? "Searching clinical trials..." 
                : results.length > 0
                  ? `We found ${results.length} studies matching "${query}"` + (zipCode ? ` near ${zipCode}` : "") + "."
                  : `No exact matches for "${query}"` + (zipCode ? ` near ${zipCode}` : "") + "."
              }
            </p>
          </div>

          {loading ? (
             <div className="text-center py-20 text-slate-400">Loading...</div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((trial) => (<TrialCard key={trial.id} trial={trial} />))}
            </div>
          ) : (
            // --- NO RESULTS FALLBACK: SHOW RECOMMENDATIONS ---
            <div className="space-y-12">
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Search className="h-8 w-8" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No exact match found</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">We couldn't find a trial specifically for "{query}" in this area right now.</p>
                <button onClick={clearSearch} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md">Clear Search & Try Again</button>
              </div>

              {recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{recommendationTitle}</h3>
                      <p className="text-sm text-slate-500">You may know someone who could benefit from these active studies.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map((trial) => (
                      <TrialCard key={trial.id} trial={trial} />
                    ))}
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