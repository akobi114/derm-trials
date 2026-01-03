"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Loader2, ChevronRight, Search, 
  Stethoscope, UserPlus, CheckCircle2, AlertCircle,
  Building2, Info, Users, Plus, X, ArrowRight
} from 'lucide-react';

interface Investigator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Trial {
  id: string; // trial_location uuid
  nct_id: string;
  official_title: string;
  facility_name: string;
  is_newly_added?: boolean; 
}

interface AssignmentProps {
  organizationId: string | null;
  organizationName: string;
  roster: Investigator[];
  onComplete: () => void;
  onBack: () => void;
}

export default function ProtocolAssignment({ organizationId, organizationName, roster, onComplete, onBack }: AssignmentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectedTrials, setDetectedTrials] = useState<Trial[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { investigators: string[], primaryPI: string | null }>>({});

  // Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrialForLoc, setSelectedTrialForLoc] = useState<any | null>(null);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  // --- 1. DETECT TRIALS FOR THIS SITE ---
  useEffect(() => {
    async function fetchSiteTrials() {
      setLoading(true);
      try {
        // Find trials matching this facility name or organization
        const { data, error } = await supabase
          .from('trial_locations')
          .select(`
            id,
            facility_name,
            trials (
              nct_id,
              official_title
            )
          `)
          .ilike('facility_name', `%${organizationName}%`);

        if (error) throw error;

        const formatted = (data || []).map((item: any) => ({
          id: item.id,
          nct_id: item.trials.nct_id,
          official_title: item.trials.official_title,
          facility_name: item.facility_name
        }));

        setDetectedTrials(formatted);
        
        // Initialize assignments state
        const initial: any = {};
        formatted.forEach(t => {
          initial[t.id] = { investigators: [], primaryPI: null };
        });
        setAssignments(initial);

      } catch (err) {
        console.error("Error fetching trials:", err);
      } finally {
        setLoading(false);
      }
    }
    if (organizationName) {
      fetchSiteTrials();
    } else {
      setLoading(false);
    }
  }, [organizationName]);

  // --- 2. TOGGLE INVESTIGATOR ON TRIAL ---
  const toggleInvestigator = (trialId: string, invId: string) => {
    setAssignments(prev => {
      // Safety check: initialize if missing
      const current = prev[trialId]?.investigators || [];
      const isSelected = current.includes(invId);
      
      const nextInvs = isSelected 
        ? current.filter(id => id !== invId)
        : [...current, invId];

      // If removing the primary PI, reset it
      let nextPrimary = prev[trialId]?.primaryPI;
      if (isSelected && nextPrimary === invId) nextPrimary = null;
      // If adding the first investigator, set them as primary by default
      if (!isSelected && nextInvs.length === 1) nextPrimary = invId;

      return {
        ...prev,
        [trialId]: { investigators: nextInvs, primaryPI: nextPrimary }
      };
    });
  };

  // --- 3. MANUAL SEARCH FUNCTIONS ---
  const handleGlobalSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    setSelectedTrialForLoc(null);
    const { data } = await supabase
      .from('trials')
      .select('*')
      .or(`nct_id.ilike.%${searchQuery}%,official_title.ilike.%${searchQuery}%`)
      .limit(5);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleFetchLocations = async (trial: any) => {
    setSelectedTrialForLoc(trial);
    const { data } = await supabase
        .from('trial_locations')
        .select('*')
        .eq('trial_id', trial.id);
    
    // Filter logic similar to main library
    const valid = (data || []).filter((loc: any) => 
       ['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING'].includes(loc.status?.toUpperCase())
    );
    setAvailableLocations(valid);
  };

  const handleAddManualLocation = (loc: any) => {
    // Add to main list
    const newTrial: Trial = {
        id: loc.id,
        nct_id: selectedTrialForLoc.nct_id,
        official_title: selectedTrialForLoc.official_title,
        facility_name: loc.facility_name,
        is_newly_added: true
    };

    setDetectedTrials(prev => [...prev, newTrial]);
    setAssignments(prev => ({
        ...prev,
        [loc.id]: { investigators: [], primaryPI: null }
    }));
    
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // --- 4. SAVE ALL ASSIGNMENTS (Populates claimed_trials for Admin Visibility) ---
  const handleFinalLaunch = async () => {
    if (!organizationId) {
        alert("Error: Organization ID missing.");
        return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired.");

      // Fetch the OAM's profile ID to anchor the new claims
      const { data: oamProfile } = await supabase
        .from('researcher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!oamProfile) throw new Error("Researcher profile not found.");

      // Identify unique trials selected to create records in 'claimed_trials'
      const activeLocationIds = Object.entries(assignments)
        .filter(([_, data]) => data.investigators.length > 0)
        .map(([locId, _]) => locId);

      const uniqueNctIds = Array.from(new Set(
        activeLocationIds.map(id => detectedTrials.find(t => t.id === id)?.nct_id).filter(Boolean)
      ));

      // 1. Create the Claims (This populates the Admin Dashboard "Trials Requested" area)
      const claimInserts = uniqueNctIds.map(nctId => {
        const trial = detectedTrials.find(t => t.nct_id === nctId);
        // Find the specific location used
        const locId = activeLocationIds.find(lid => detectedTrials.find(dt => dt.id === lid)?.nct_id === nctId);
        const specificTrial = detectedTrials.find(t => t.id === locId);

        return {
          nct_id: nctId,
          organization_id: organizationId,
          researcher_id: oamProfile.id,
          status: 'pending_verification',
          site_location: specificTrial ? { 
            id: specificTrial.id, 
            facility_name: specificTrial.facility_name,
            city: (specificTrial as any).city, // Optional: Include city/state if available in Trial object
            state: (specificTrial as any).state
          } : null
        };
      });

      const { error: claimErr } = await supabase.from('claimed_trials').insert(claimInserts);
      if (claimErr) throw claimErr;

      // 2. Create the Assignments for each investigator
      for (const locId of activeLocationIds) {
          const trial = detectedTrials.find(t => t.id === locId);
          const data = assignments[locId];
          
          for (const invId of data.investigators) {
              const human = roster.find(r => r.id === invId);
              if (!human) continue;

              // Find the permanent team member ID using email
              const { data: tm } = await supabase
                  .from('team_members')
                  .select('id')
                  .eq('email', human.email)
                  .eq('organization_id', organizationId)
                  .maybeSingle();

              if (tm) {
                  await supabase.from('trial_assignments').insert({
                      organization_id: organizationId,
                      trial_id: trial?.nct_id,
                      location_id: locId,
                      team_member_id: tm.id,
                      role_on_trial: data.primaryPI === invId ? 'Principal Investigator' : 'Sub-Investigator'
                  });
              }
          }
      }

      onComplete();
    } catch (err: any) {
      console.error("Critical Launch Failure:", err);
      alert("Failed to save site protocols: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest">Scanning Registry for Site Matches...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative">
      <div className="flex justify-between items-start mb-10">
        <div>
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Stage 04</h3>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Site Protocols</h2>
            <p className="text-slate-500 mt-2 font-medium">Assign your medical team to the trials running at your location.</p>
        </div>
        <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
        >
            <Search className="h-4 w-4" /> Manual Search
        </button>
      </div>

      {detectedTrials.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 mb-8">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-slate-900 mb-1">No Active Trials Detected</h4>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">We couldn't find active studies registered for "{organizationName}".</p>
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
            >
                Search Registry Manually
            </button>
        </div>
      ) : (
        <div className="space-y-6 mb-12">
          {detectedTrials.map((trial) => (
            <div key={trial.id} className={`bg-white border rounded-[2rem] p-8 shadow-sm transition-all group ${trial.is_newly_added ? 'border-indigo-200 ring-4 ring-indigo-50/50' : 'border-slate-100'}`}>
               <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest">{trial.nct_id}</span>
                        {trial.is_newly_added && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">Added</span>}
                    </div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{trial.official_title}</h4>
                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {trial.facility_name}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                     <Users className="h-3.5 w-3.5 text-slate-400" />
                     {/* Added Safe Navigation Operator (?.) to prevent crashes if assignments not yet init */}
                     <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{assignments[trial.id]?.investigators?.length || 0} Assigned</span>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assign Investigators</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roster.map((inv) => {
                      const isAssigned = assignments[trial.id]?.investigators?.includes(inv.id);
                      const isPrimary = assignments[trial.id]?.primaryPI === inv.id;
                      
                      return (
                        <button 
                          key={inv.id}
                          onClick={() => toggleInvestigator(trial.id, inv.id)}
                          className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                            isAssigned 
                            ? 'border-indigo-600 bg-indigo-50/50' 
                            : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                               <Stethoscope className="h-4 w-4" />
                             </div>
                             <div className="text-left">
                               <p className={`text-[10px] font-black uppercase tracking-tight ${isAssigned ? 'text-indigo-900' : 'text-slate-500'}`}>Dr. {inv.lastName}</p>
                               <p className="text-[9px] text-slate-400 font-bold">{isPrimary ? 'Primary PI' : 'Sub-PI'}</p>
                             </div>
                          </div>
                          {isAssigned && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                        </button>
                      );
                    })}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* MANUAL SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 flex flex-col h-[70vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900">Find Protocol</h3>
                    <button onClick={() => setIsSearchOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
                </div>
                
                {!selectedTrialForLoc ? (
                    <>
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Enter NCT ID..."
                                className="w-full pl-12 pr-4 py-4 bg-slate-100 rounded-2xl font-bold outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                            />
                            {searching && <Loader2 className="absolute right-4 top-4 h-5 w-5 animate-spin text-indigo-500" />}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {searchResults.map(t => (
                                <button key={t.id} onClick={() => handleFetchLocations(t)} className="w-full text-left p-4 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100">
                                    <div className="font-bold text-slate-900">{t.official_title}</div>
                                    <div className="text-xs text-slate-500">{t.nct_id}</div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <button onClick={() => setSelectedTrialForLoc(null)} className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-1"><ArrowRight className="h-3 w-3 rotate-180" /> Back</button>
                        <h4 className="font-bold text-slate-900 mb-4">Select Facility for {selectedTrialForLoc.nct_id}</h4>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {availableLocations.length === 0 ? (
                                <p className="text-center text-slate-400 py-8 text-sm">No recruiting locations found.</p>
                            ) : availableLocations.map(loc => (
                                <button key={loc.id} onClick={() => handleAddManualLocation(loc)} className="w-full p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:border-indigo-500 hover:shadow-md transition-all">
                                    <div className="text-left">
                                        <div className="font-bold text-slate-900 text-sm">{loc.facility_name}</div>
                                        <div className="text-xs text-slate-500">{loc.city}, {loc.state}</div>
                                    </div>
                                    <Plus className="h-5 w-5 text-indigo-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* FOOTER ACTIONS */}
      <div className="flex gap-4 border-t border-slate-100 pt-8 mt-4">
        <button onClick={onBack} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
            Back to Roster
        </button>
        <button 
            onClick={handleFinalLaunch} 
            disabled={saving}
            className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Launch Site Portal <ChevronRight className="h-5 w-5" /></>}
        </button>
      </div>
    </div>
  );
}