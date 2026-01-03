"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Plus, Loader2, X, CheckCircle2, 
  MapPin, Building2, ArrowRight, Sparkles, AlertCircle, Globe 
} from 'lucide-react';

interface DiscoveryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | null;
  orgName: string;
  existingNctIds: string[];
  onTrialAdded: (nctId: string) => void;
}

// FIX 1: Allow all recruitment statuses
const CLAIMABLE_STATUSES = ['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION'];

export default function DiscoveryOverlay({ isOpen, onClose, orgId, orgName, existingNctIds, onTrialAdded }: DiscoveryOverlayProps) {
  const [activeTab, setActiveTab] = useState<'suggested' | 'search'>('suggested');
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]); // Global Search Results
  const [searching, setSearching] = useState(false);
  
  // Selection Logic (Premium Slide-Over)
  const [selectedTrial, setSelectedTrial] = useState<any | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [claimingLocId, setClaimingLocId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // --- 1. LOAD SUGGESTIONS ---
  useEffect(() => {
    if (isOpen && orgName) fetchSuggestions();
  }, [isOpen, orgName]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
        const { data, error } = await supabase
            .from('trial_locations')
            .select(`*, trials (nct_id, official_title, phase, sponsor)`)
            .ilike('facility_name', `%${orgName}%`)
            .limit(20);

        if (error) throw error;
        
        const valid = (data || []).filter((loc: any) => 
            loc.status && CLAIMABLE_STATUSES.includes(loc.status.toUpperCase())
        );

        // Filter out already claimed
        const { data: existingClaims } = await supabase.from('claimed_trials').select('site_location');
        const claimedIds = new Set(existingClaims?.map((c: any) => c.site_location?.id).filter(Boolean));
        
        setSuggestions(valid.filter((loc: any) => !claimedIds.has(loc.id)));
    } catch (err) {
        console.error("Suggestion error:", err);
    } finally {
        setLoadingSuggestions(false);
    }
  };

  // --- 2. GLOBAL SEARCH ---
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelectedTrial(null);
    
    const { data } = await supabase
      .from('trials')
      .select('*')
      .or(`nct_id.ilike.%${query}%,official_title.ilike.%${query}%`)
      .limit(10);

    setResults(data || []);
    setSearching(false);
  };

  // --- 3. SELECT TRIAL (RESTORED PREMIUM UI) ---
  const handleSelectGlobalTrial = async (trial: any) => {
    setSelectedTrial(trial);
    setLoadingLocs(true);
    setLocations([]); // Clear previous
    
    try {
        const { data: locs } = await supabase
            .from('trial_locations')
            .select('*')
            .eq('trial_id', trial.id);

        if (locs) {
            const { data: claims } = await supabase.from('claimed_trials').select('site_location').eq('nct_id', trial.nct_id);
            const claimedIds = new Set(claims?.map((c: any) => c.site_location?.id).filter(Boolean));
            
            const processed = locs.map(l => ({
                ...l,
                is_claimed: claimedIds.has(l.id),
                is_valid: l.status && CLAIMABLE_STATUSES.includes(l.status.toUpperCase())
            })).sort((a, b) => (a.is_claimed === b.is_claimed ? 0 : a.is_claimed ? 1 : -1));
            
            setLocations(processed);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoadingLocs(false);
    }
  };

  // --- 4. CLAIM LOGIC (AUTO-APPROVE FIX) ---
  const handleClaim = async (location: any, trialData: any) => {
    if (!orgId) return;
    setClaimingLocId(location.id);

    try {
        const { error } = await supabase
            .from('claimed_trials')
            .insert({
                organization_id: orgId,
                nct_id: trialData.nct_id,
                status: 'approved', // FIX 2: Set directly to approved
                site_location: {
                    id: location.id,
                    facility_name: location.facility_name,
                    city: location.city,
                    state: location.state,
                    status: location.status 
                }
            });

        if (error) throw error;

        onTrialAdded(trialData.nct_id); 
        
        // Optimistic UI Update
        if (activeTab === 'suggested') {
            setSuggestions(prev => prev.filter(s => s.id !== location.id));
        } else {
            setLocations(prev => prev.map(l => l.id === location.id ? { ...l, is_claimed: true } : l));
        }

    } catch (err) {
        alert("Failed to claim study.");
    } finally {
        setClaimingLocId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 pb-0 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add Protocol</h2>
            <p className="text-slate-500 font-medium mt-1">Claim a site to begin recruitment.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
        </div>

        {/* Tabs */}
        <div className="px-8 mt-8 flex gap-6 border-b border-slate-100">
            <button onClick={() => setActiveTab('suggested')} className={`pb-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'suggested' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Suggested</button>
            <button onClick={() => setActiveTab('search')} className={`pb-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'search' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Global Search</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-50/50 p-8 relative">
            
            {/* SUGGESTED TAB */}
            {activeTab === 'suggested' && (
                <div className="h-full overflow-y-auto pr-2 space-y-4">
                    {loadingSuggestions ? (
                         <div className="text-center py-20 text-slate-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Scanning...</p></div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                            <p className="font-bold text-slate-400">No suggestions found.</p>
                            <button onClick={() => setActiveTab('search')} className="mt-2 text-indigo-600 font-black text-xs uppercase hover:underline">Search Manually</button>
                        </div>
                    ) : (
                        suggestions.map((loc) => (
                            <div key={loc.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-6 hover:shadow-md transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{loc.trials?.nct_id}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${loc.status === 'RECRUITING' ? 'text-emerald-600' : 'text-amber-500'}`}>{loc.status}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 leading-tight">{loc.trials?.official_title}</h3>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {loc.facility_name}, {loc.city}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleClaim(loc, loc.trials)}
                                    disabled={claimingLocId === loc.id}
                                    className="shrink-0 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    {claimingLocId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Claim</>}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* SEARCH TAB - STEP 1 (List) */}
            {activeTab === 'search' && !selectedTrial && (
                <div className="h-full flex flex-col">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input autoFocus type="text" placeholder="Enter NCT ID..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                        {searching && <Loader2 className="absolute right-4 top-4 h-5 w-5 animate-spin text-indigo-500" />}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {results.length === 0 && !searching && (
                            <div className="text-center py-20 opacity-50">
                                <Globe className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Search Global Database</p>
                            </div>
                        )}
                        {results.map((trial) => (
                            <button key={trial.id} onClick={() => handleSelectGlobalTrial(trial)} className="w-full text-left p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-lg transition-all group flex justify-between items-center">
                                <div>
                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{trial.nct_id}</span>
                                    <h3 className="font-bold text-slate-900 mt-2 text-lg group-hover:text-indigo-700 transition-colors">{trial.official_title}</h3>
                                </div>
                                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><ArrowRight className="h-5 w-5" /></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* SEARCH TAB - STEP 2 (Locations Slide-Over) */}
            {activeTab === 'search' && selectedTrial && (
                <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                    <button onClick={() => setSelectedTrial(null)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 mb-4 uppercase tracking-wide"><ArrowRight className="h-3 w-3 rotate-180" /> Back to Search Results</button>
                    
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 mb-6 shadow-sm">
                        <h3 className="font-black text-xl text-slate-900">{selectedTrial.official_title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{selectedTrial.nct_id}</span>
                        </div>
                    </div>

                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Your Facility</h4>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {loadingLocs ? (
                            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" /></div>
                        ) : locations.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"><p className="font-bold text-slate-400">No locations found.</p></div>
                        ) : (
                            locations.map(loc => {
                                const isDisabled = loc.is_claimed || !loc.is_valid;
                                return (
                                    <div key={loc.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isDisabled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${isDisabled ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}><Building2 className="h-5 w-5" /></div>
                                            <div>
                                                <h5 className={`font-bold text-sm ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>{loc.facility_name}</h5>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><span>{loc.city}, {loc.state}</span><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span className={loc.status === 'RECRUITING' ? 'text-emerald-600' : 'text-amber-500'}>{loc.status}</span></div>
                                            </div>
                                        </div>
                                        {!loc.is_claimed && loc.is_valid && (
                                            <button onClick={() => handleClaim(loc, selectedTrial)} disabled={claimingLocId === loc.id} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg active:scale-95">
                                                {claimingLocId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Claim'}
                                            </button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}