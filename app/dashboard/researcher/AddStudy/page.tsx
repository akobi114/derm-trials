"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Search, MapPin, Trash2, ChevronRight, Building2, 
  HelpCircle, X, Send, CheckSquare, Square, CheckCircle2, 
  ArrowLeft, Clock, Plus, Info, Inbox, Sparkles, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const getLocationKey = (loc: any) => {
  if (!loc) return "null-loc";
  const c = (loc.city || "").trim().toLowerCase();
  const s = (loc.state || "").trim().toLowerCase();
  const f = (loc.facility || "").trim().toLowerCase(); 
  return `${c}|${s}|${f}`;
};

export default function AddStudyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Search & Staging State
  const [claimQuery, setClaimQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stagedClaims, setStagedClaims] = useState<any[]>([]); 
  const [showSuccess, setShowSuccess] = useState(false); // Success state

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<any>(null);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [claimedByOthers, setClaimedByOthers] = useState<any[]>([]); // New: Global exclusivity state
  const [selectedSites, setSelectedSites] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Support State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState('missing_trial');
  const [supportMessage, setSupportMessage] = useState("");

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(prof);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchForTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimQuery.trim()) return;
    setSearchLoading(true); setHasSearched(false);
    const { data } = await supabase.from('trials').select('*').or(`nct_id.ilike.%${claimQuery.trim()}%,title.ilike.%${claimQuery.trim()}%`).limit(5);
    setSearchResults(data || []); setSearchLoading(false); setHasSearched(true);
  };

  const initiateClaim = async (trial: any) => {
    setSelectedTrial(trial); setSelectedSites([]); setIsModalOpen(true);
    
    // FETCH GLOBAL CLAIMS: Query without researcher_id to find any existing claims
    const { data: globalClaims } = await supabase
      .from('claimed_trials')
      .select('site_location, researcher_id')
      .eq('nct_id', trial.nct_id);

    const globalClaimedSet = new Set(globalClaims?.map((c: any) => getLocationKey(c.site_location)) || []);
    const stagedSet = new Set(stagedClaims.filter(s => s.nct_id === trial.nct_id).map(s => getLocationKey(s.site_location)));
    
    // 1. Available = Not claimed globally and not in local queue
    setAvailableLocations((trial.locations || []).filter((loc: any) => 
      !globalClaimedSet.has(getLocationKey(loc)) && !stagedSet.has(getLocationKey(loc))
    ));

    // 2. Claimed by Others = Locations found in global claims not belonging to current user
    setClaimedByOthers((trial.locations || []).filter((loc: any) => {
        const key = getLocationKey(loc);
        return globalClaims?.some(gc => getLocationKey(gc.site_location) === key && gc.researcher_id !== profile.id);
    }));
  };

  const handleDispute = (loc: any) => {
    setSupportCategory('claim_dispute');
    setSupportMessage(`Dispute Claim for Protocol: ${selectedTrial.nct_id}
Location: ${loc.facility || loc.city}, ${loc.city}, ${loc.state}

Reason: `);
    setIsModalOpen(false);
    setIsSupportOpen(true);
  };

  const addToStaging = () => {
    const newEntries = selectedSites.map(site => ({
      nct_id: selectedTrial.nct_id, title: selectedTrial.title, site_location: site, id: Math.random().toString(36).substr(2, 9)
    }));
    setStagedClaims(prev => [...prev, ...newEntries]);
    setIsModalOpen(false); setSearchResults([]); setClaimQuery("");
  };

  const finalizeClaims = async () => {
    setActionLoading(true);
    const status = profile.is_verified ? 'approved' : 'pending_verification';
    try {
        const inserts = stagedClaims.map(s => ({ nct_id: s.nct_id, researcher_id: profile.id, status: status, site_location: s.site_location }));
        await supabase.from('claimed_trials').insert(inserts);
        setShowSuccess(true); // Trigger success view
    } catch (err: any) { alert(err.message); } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-white"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;

  // --- RENDER: SUCCESS VIEW ---
  if (showSuccess) return (
    <div className="max-w-2xl mx-auto py-20 animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Studies Added!</h1>
        <p className="text-slate-500 text-lg mb-10 leading-relaxed">
          You have successfully added <strong>{stagedClaims.length} study locations</strong> to your portal. 
          {profile.is_verified ? " They are now active and ready for recruitment." : " They are queued for admin verification."}
        </p>
        
        <div className="grid grid-cols-1 gap-3 mb-10">
          <button 
            onClick={() => { setShowSuccess(false); setStagedClaims([]); }}
            className="w-full py-5 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Add More Protocols
          </button>
          <Link 
            href="/dashboard/researcher"
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
          >
            Go to Dashboard <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700 pb-24">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard/researcher" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-widest mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Add New Study</h1>
        </div>
        <button 
          onClick={() => { setSupportCategory('missing_trial'); setSupportMessage(""); setIsSupportOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Protocol missing?
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Search & Locator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Step 01. Locate Protocol</h3>
              <form onSubmit={searchForTrial} className="relative group">
                <Search className="absolute left-5 top-5 h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search by NCT ID or Protocol Title..." 
                  className="w-full pl-14 pr-32 p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-slate-700 transition-all shadow-inner placeholder:text-slate-300" 
                  value={claimQuery} 
                  onChange={(e) => setClaimQuery(e.target.value)} 
                />
                <button type="submit" className="absolute right-3 top-3 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </button>
              </form>
            </div>
            
            <div className="p-4">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((trial) => (
                    <div key={trial.nct_id} className="p-5 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:border-indigo-200 hover:shadow-md transition-all group">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase">{trial.nct_id}</span>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Phase {trial.phase || 'N/A'}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm truncate leading-tight pr-4">{trial.title}</h4>
                      </div>
                      <button 
                        onClick={() => initiateClaim(trial)} 
                        className="shrink-0 bg-slate-50 text-slate-900 p-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group-hover:shadow-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : hasSearched && !searchLoading ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Info className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium mb-1">No matching protocols found.</p>
                  <button onClick={() => { setSupportCategory('missing_trial'); setSupportMessage(""); setIsSupportOpen(true); }} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Request manual addition</button>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">Enter an NCT ID to begin search</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Staging Queue */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden sticky top-8">
            <div className="p-8 border-b border-white/5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Step 02. Finalize List</h3>
                <span className="px-2 py-1 bg-white/10 rounded-md text-[10px] font-black text-white uppercase">{stagedClaims.length} Queued</span>
              </div>
            </div>

            <div className="p-6 min-h-[300px]">
              {stagedClaims.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <Inbox className="h-10 w-10 text-slate-700 mb-4" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest px-10 leading-relaxed">Your staging queue is empty. Protocols added from search will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stagedClaims.map((s) => (
                    <div key={s.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center animate-in slide-in-from-right-4">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{s.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase">{s.nct_id}</span>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {s.site_location?.city}</span>
                        </div>
                      </div>
                      <button onClick={() => setStagedClaims(prev => prev.filter(x => x.id !== s.id))} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 bg-black/20 border-t border-white/5">
              <button 
                onClick={finalizeClaims} 
                disabled={stagedClaims.length === 0 || actionLoading} 
                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-20 disabled:grayscale group"
              >
                {actionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    Finalize & Add Studies
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Modals */}
      {isModalOpen && <ClaimModal setIsModalOpen={setIsModalOpen} selectedTrial={selectedTrial} availableLocations={availableLocations} claimedByOthers={claimedByOthers} getLocationKey={getLocationKey} selectedSites={selectedSites} toggleSite={(loc: any) => { const key = getLocationKey(loc); if (selectedSites.some(s => getLocationKey(s) === key)) { setSelectedSites(prev => prev.filter(s => getLocationKey(s) !== key)); } else { setSelectedSites(prev => [...prev, loc]); } }} confirmClaim={addToStaging} onDispute={handleDispute} />}
      {isSupportOpen && <SupportModal setIsSupportOpen={setIsSupportOpen} supportCategory={supportCategory} setSupportCategory={setSupportCategory} supportMessage={supportMessage} setSupportMessage={setSupportMessage} submitTicket={async () => { await supabase.from('support_tickets').insert({ user_id: profile.user_id, researcher_name: `${profile.first_name} ${profile.last_name}`, researcher_email: profile.email, category: supportCategory, subject: `Dispute Inquiry: ${supportCategory}`, message: supportMessage }); alert("Request sent to admin."); setIsSupportOpen(false); }} />}
    </div>
  );
}

// Redesigned Support Modal
function SupportModal({ setIsSupportOpen, supportCategory, setSupportCategory, supportMessage, setSupportMessage, submitTicket }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-2xl text-slate-900 tracking-tight uppercase">{supportCategory === 'claim_dispute' ? 'Dispute Claim' : 'Manual Request'}</h3>
              <button onClick={() => setIsSupportOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                >
                    <option value="missing_trial">Trial Missing from Database</option>
                    <option value="claim_dispute">Claim Dispute / Ownership</option>
                    <option value="other">Other Inquiry</option>
                </select>
            </div>
            <textarea 
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl h-44 text-sm mb-6 outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all shadow-inner" 
              placeholder="Provide protocol and location details..." 
              value={supportMessage} 
              onChange={(e) => setSupportMessage(e.target.value)} 
            />
            <button onClick={submitTicket} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3">
              <Send className="h-4 w-4" /> Send Message
            </button>
        </div>
    </div>
  );
}

// Redesigned Site Selector Modal
function ClaimModal({ setIsModalOpen, selectedTrial, availableLocations, claimedByOthers, getLocationKey, selectedSites, toggleSite, confirmClaim, onDispute }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8">
            <div className="shrink-0 mb-8 flex justify-between items-start">
              <div>
                <h3 className="font-black text-2xl text-slate-900 mb-2 uppercase">Select Site Locations</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedTrial?.nct_id}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-10 space-y-6 pr-2 custom-scrollbar">
                {/* AVAILABLE SECTION */}
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Available Locations</h4>
                    <div className="space-y-2">
                        {availableLocations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl text-xs font-bold uppercase">No sites currently available.</div>
                        ) : availableLocations.map((loc: any, idx: number) => {
                            const key = getLocationKey(loc); const isSelected = selectedSites.some((s:any) => getLocationKey(s) === key);
                            return (
                                <button 
                                  key={idx} 
                                  onClick={() => toggleSite(loc)} 
                                  className={`w-full text-left p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 transform ${isSelected ? 'bg-white shadow-xl ring-2 ring-indigo-500 scale-[1.01]' : 'hover:bg-white hover:shadow-sm border border-transparent'}`}
                                >
                                    <div className={`mt-0.5 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-200'}`}>{isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}</div>
                                    <div>
                                      <div className={`font-black text-base leading-tight uppercase ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{loc.facility || loc.city}</div>
                                      <div className={`text-[10px] font-black mt-1 uppercase ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{loc.city}, {loc.state}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CLAIMED BY OTHERS SECTION */}
                {claimedByOthers.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Claimed by another researcher</h4>
                        <div className="space-y-2">
                            {claimedByOthers.map((loc: any, idx: number) => (
                                <div key={idx} className="w-full p-5 rounded-2xl flex items-center justify-between bg-slate-50 border border-slate-100 opacity-80">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-0.5 text-slate-300"><Square className="h-6 w-6" /></div>
                                        <div>
                                            <div className="font-black text-base leading-tight uppercase text-slate-400 line-through">{loc.facility || loc.city}</div>
                                            <div className="text-[10px] font-black mt-1 uppercase text-slate-400">{loc.city}, {loc.state}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onDispute(loc)}
                                        className="px-4 py-2 bg-white border border-amber-200 text-amber-600 text-[10px] font-black uppercase rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                                    >
                                        Dispute Claim
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-4 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border border-slate-200 bg-white rounded-2xl font-black text-xs text-slate-400 uppercase tracking-widest">Cancel</button>
              <button 
                onClick={confirmClaim} 
                disabled={selectedSites.length === 0}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                Queue Selected {selectedSites.length > 0 && `(${selectedSites.length})`}
              </button>
            </div>
        </div>
    </div>
  );
}