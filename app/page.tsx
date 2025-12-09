"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import TrialCard from '@/components/TrialCard';
import { Search, MapPin, Sparkles, Globe, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // --- STATES ---
  const [query, setQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [distance, setDistance] = useState(100);
  const [hasSearched, setHasSearched] = useState(false); // Controls the layout View

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recruitingCount, setRecruitingCount] = useState<number | null>(null);
  const [featuredTrials, setFeaturedTrials] = useState<any[]>([]);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    async function getStatsAndFeatured() {
      // 1. Get Count (Recruiting only)
      const { count } = await supabase
        .from('trials')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'recruiting');
      setRecruitingCount(count || 0);

      // 2. Get Featured Carousel (Newest Recruiting)
      const { data } = await supabase
        .from('trials')
        .select('*')
        .ilike('status', 'recruiting')
        .order('last_updated', { ascending: false })
        .limit(6);
      setFeaturedTrials(data || []);
    }
    getStatsAndFeatured();
  }, []);

  // --- SEARCH HANDLER ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true); // Switches UI to "Results" view
    setResults([]);

    try {
      let lat = null;
      let lon = null;

      // 1. Geocode Zip if present
      if (zipCode.trim()) {
        const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          lat = parseFloat(geoData.places[0].latitude);
          lon = parseFloat(geoData.places[0].longitude);
        } else {
          // If zip fails, we just continue with text search, or you could alert
          console.warn("Invalid Zip Code");
        }
      }

      // 2. Run Query
      if (lat && lon) {
        // Geospatial Search
        const { data, error } = await supabase.rpc('get_trials_nearby', {
          lat,
          long: lon,
          miles: distance,
          search_term: query.trim() || null
        });
        if (error) console.error(error);
        setResults(data || []);
      } else {
        // Standard Text Search
        const { data, error } = await supabase
          .from('trials')
          .select('*')
          .or(`title.ilike.%${query}%,condition.ilike.%${query}%`)
          .limit(50);
        
        if (error) console.error(error);
        setResults(data || []);
      }

    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- RESET HANDLER ---
  const clearSearch = () => {
    setHasSearched(false);
    setQuery('');
    setZipCode('');
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {!hasSearched ? (
        // ============================================================
        // VIEW A: HOME PAGE (Hero + Carousel)
        // ============================================================
        <>
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
              
              {/* Status Badge */}
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold mb-6 border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {recruitingCount !== null ? `${recruitingCount} Trials Recruiting Now` : "Checking active trials..."}
              </span>

              {/* HEADLINE (Restored) */}
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Access Tomorrow’s <span className="text-indigo-600">Dermatology Treatments</span>, Today.
              </h1>

              {/* SUBHEADLINE (Restored) */}
              <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the exclusive community matching patients with breakthrough skin research. Find paid trials for Psoriasis, Eczema, Acne, and more.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-12 bg-white p-2 rounded-2xl border border-slate-200 shadow-lg flex flex-col md:flex-row gap-2">
                
                {/* Condition Input */}
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Condition (e.g. Acne)"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {/* Zip Input */}
                <div className="relative w-full md:w-40">
                  <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    maxLength={5}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </div>

                {/* Distance Dropdown */}
                <div className="relative w-full md:w-32">
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                  >
                    <option value="25">25 Miles</option>
                    <option value="50">50 Miles</option>
                    <option value="100">100 Miles</option>
                    <option value="500">500 Miles</option>
                  </select>
                </div>

                {/* Search Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
                >
                  {loading ? '...' : 'Search'}
                </button>
              </form>

              {/* Trust Badges */}
              <div className="flex justify-center gap-8 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  <span>US Locations Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span>FDA Regulated Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel & Categories */}
          <div className="pb-20">
            {featuredTrials.length > 0 && (
              <div className="py-12 border-b border-slate-200 bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-indigo-600 fill-indigo-100" />
                    <h2 className="text-xl font-bold text-slate-900">New & Recruiting</h2>
                  </div>
                  <div className="flex overflow-x-auto gap-6 pb-6 snap-x scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
                    {featuredTrials.map((trial) => (
                      <div key={trial.id} className="min-w-[320px] max-w-[320px] snap-center">
                        <TrialCard trial={trial} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-5xl mx-auto px-6 py-16">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Explore by Condition</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Acne', 'Psoriasis', 'Eczema', 'Rosacea'].map((cond) => (
                  <Link 
                    key={cond}
                    href={`/condition/${cond}`}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-600 hover:shadow-md transition-all group"
                  >
                    <span className="font-bold text-slate-700 group-hover:text-indigo-600">{cond}</span>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        // ============================================================
        // VIEW B: SEARCH RESULTS PAGE
        // ============================================================
        <div className="max-w-7xl mx-auto px-6 py-10">
          
          {/* Back Button */}
          <button 
            onClick={clearSearch} 
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </button>

          {/* Header */}
          <div className="mb-10 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Search Results</h1>
            <p className="text-slate-600 text-lg">
              {loading 
                ? "Searching clinical trials..." 
                : `We found ${results.length} studies matching "${query}"` + (zipCode ? ` near ${zipCode}` : "") + "."
              }
            </p>
          </div>

          {/* Results Grid */}
          {loading ? (
             <div className="text-center py-20 text-slate-400">Loading...</div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((trial) => (
                <TrialCard key={trial.id} trial={trial} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 mb-4">No trials found matching your criteria.</p>
              <button onClick={clearSearch} className="text-indigo-600 font-bold hover:underline">
                Try a different search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}