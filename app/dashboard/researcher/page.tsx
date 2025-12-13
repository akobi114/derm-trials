"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, LayoutDashboard, Settings, LogOut, CheckCircle2, 
  Plus, Search, MapPin, Users, Trash2, Edit3, CreditCard, 
  ChevronRight, BarChart3, Building2
} from 'lucide-react';
import Link from 'next/link';

export default function ResearcherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [claimingMode, setClaimingMode] = useState(false);
  const [claimQuery, setClaimQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal & Selection States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<any>(null);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error("Profile Fetch Error:", profileError);
      }

      if (profileData) {
        setProfile(profileData);
        
        // 2. Fetch Claims + Trial Data
        const { data: claims } = await supabase
          .from('claimed_trials')
          .select(`
            *, 
            trials (
              *,
              leads (count)
            )
          `)
          .eq('researcher_id', profileData.id);
        
        if (claims) {
            const formatted = claims.map((c: any) => ({
                ...c.trials, 
                claim_id: c.id, 
                claim_status: c.status,
                // IMPORTANT: Attach the specific site location from the claim
                site_location: c.site_location,
                lead_count: c.trials?.leads?.[0]?.count || 0
            }));
            setMyTrials(formatted);
        }
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const searchForTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    const { data } = await supabase.from('trials').select('*').or(`nct_id.ilike.%${claimQuery}%,title.ilike.%${claimQuery}%`).limit(5);
    setSearchResults(data || []);
    setSearchLoading(false);
  };

  // --- NEW: PROACTIVE CLAIMING LOGIC ---
  const initiateClaim = async (trial: any) => { 
      setSelectedTrial(trial);
      setSelectedSite(null);
      setAvailableLocations([]); // Clear previous state
      setIsModalOpen(true); // Open immediately while loading availability

      // 1. Get all possible locations from the Trial Data
      const allLocations = trial.locations || [];

      // 2. Fetch which locations are ALREADY claimed by ANY researcher
      const { data: existingClaims } = await supabase
        .from('claimed_trials')
        .select('site_location')
        .eq('nct_id', trial.nct_id);

      // 3. Filter the list
      const claimedKeys = new Set(existingClaims?.map((c: any) => 
        `${c.site_location?.city}-${c.site_location?.state}`
      ) || []);
      
      const available = allLocations.filter((loc: any) => 
        !claimedKeys.has(`${loc.city}-${loc.state}`)
      );

      setAvailableLocations(available);
      
      // Auto-select the first one if available to save a click
      if (available.length > 0) setSelectedSite(available[0]);
  };
  
  const confirmClaim = async () => {
    if (!selectedTrial) return;
    if (!profile || !profile.id) {
        alert("Error: Profile not found.");
        return;
    }
    // Validation: Must select a site if locations exist
    if (availableLocations.length > 0 && !selectedSite) {
        alert("Please select which site location you are managing.");
        return;
    }

    setActionLoading(true);
    
    // Insert with the specific SITE LOCATION
    const { data, error } = await supabase
        .from('claimed_trials')
        .insert({ 
            nct_id: selectedTrial.nct_id, 
            researcher_id: profile.id, 
            status: 'approved',
            site_location: selectedSite || {} // Save the JSON object
        })
        .select()
        .single();

    if (error) { 
        console.error("Claim Error:", error);
        if (error.code === '23505') {
            alert("This specific location is already claimed.");
        } else {
            alert("Error claiming trial: " + error.message); 
        }
    } else { 
        // Success: Update UI
        setClaimingMode(false); 
        setMyTrials([...myTrials, { 
            ...selectedTrial, 
            claim_id: data.id, 
            claim_status: 'approved', 
            site_location: selectedSite, // Store for display
            lead_count: 0 
        }]); 
        setIsModalOpen(false); 
    }
    setActionLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 h-20 flex items-center border-b border-slate-100">
          <div className="font-bold text-xl tracking-tight">Derm<span className="text-indigo-600">Trials</span></div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/researcher" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm bg-indigo-50 text-indigo-700">
            <LayoutDashboard className="h-5 w-5" /> Overview
          </Link>
          <Link href="/dashboard/researcher/billing" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <CreditCard className="h-5 w-5" /> Billing & Invoices
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 rounded-lg font-medium text-sm cursor-not-allowed">
            <Settings className="h-5 w-5" /> Settings (Coming Soon)
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm w-full transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8 relative">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-slate-500 text-sm mt-1">{profile?.company_name || "Researcher Portal"}</p>
          </div>
          {!claimingMode && (
             <button onClick={() => setClaimingMode(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-sm">
               <Plus className="h-4 w-4" /> Add New Study
             </button>
           )}
        </header>

        {/* CLAIM SEARCH UI */}
        {claimingMode ? (
            <div className="max-w-2xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input type="text" placeholder="Search by NCT ID or Title..." className="w-full pl-12 p-4 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={claimQuery} onChange={(e) => setClaimQuery(e.target.value)} autoFocus />
                    <button onClick={searchForTrial} disabled={searchLoading} className="absolute right-3 top-2.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">{searchLoading ? "Searching..." : "Search"}</button>
                </div>
                <div className="space-y-3">
                    {searchResults.map((trial) => (
                        <div key={trial.nct_id} className="bg-white p-5 rounded-xl border border-slate-200 flex justify-between items-center hover:border-indigo-200 transition-colors">
                            <div>
                                <div className="font-mono text-[10px] text-slate-400 mb-1">{trial.nct_id}</div>
                                <h4 className="font-bold text-slate-900 text-sm">{trial.title}</h4>
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {trial.locations?.length || 0} Sites Available</div>
                            </div>
                            <button onClick={() => initiateClaim(trial)} className="px-4 py-2 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-xs rounded-lg transition-colors">Select Site</button>
                        </div>
                    ))}
                </div>
                <button onClick={() => setClaimingMode(false)} className="mt-8 text-slate-400 text-sm hover:text-slate-600 font-medium block mx-auto">Cancel</button>
            </div>
        ) : (
            /* CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {myTrials.length > 0 ? myTrials.map((trial) => (
                    <div key={trial.claim_id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden group">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{trial.nct_id}</span>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Active</div>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 min-h-[3rem]">{trial.title}</h3>
                            
                            {/* DISPLAY SPECIFIC SITE */}
                            <div className="flex items-center gap-2 text-xs text-slate-600 mb-6 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <MapPin className="h-3.5 w-3.5 text-indigo-600" /> 
                                <span className="truncate font-medium">
                                    {trial.site_location?.city ? `${trial.site_location.city}, ${trial.site_location.state}` : "Remote / Main Site"}
                                </span>
                            </div>
                            
                            <div className="flex gap-4 py-4 border-t border-slate-50">
                                <div><div className="text-2xl font-bold text-slate-900">{trial.lead_count}</div><div className="text-[10px] uppercase font-bold text-slate-400">Candidates</div></div>
                                <div><div className="text-2xl font-bold text-slate-900">0</div><div className="text-[10px] uppercase font-bold text-slate-400">Screened</div></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-t border-slate-100 p-2 flex gap-2">
                            <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=profile`} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200">
                                <Edit3 className="h-3.5 w-3.5" /> Edit Page
                            </Link>
                            <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads`} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all">
                                <Users className="h-3.5 w-3.5" /> Candidates
                            </Link>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300"><LayoutDashboard className="h-6 w-6" /></div>
                        <h3 className="font-bold text-slate-900">No studies yet</h3>
                        <p className="text-slate-500 text-sm mb-6">If your trials disappeared, please refresh. Otherwise claim your first trial.</p>
                        <button onClick={() => setClaimingMode(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow hover:bg-indigo-700">Find Study</button>
                    </div>
                )}
            </div>
        )}

        {/* MODAL: SITE SELECTION */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden">
                    <h3 className="font-bold text-lg mb-2">Claim {selectedTrial?.nct_id}</h3>
                    <p className="text-sm text-slate-500 mb-6">Select the site location you manage. Locations already claimed by other researchers are hidden.</p>
                    
                    {/* SITE SELECTOR DROPDOWN */}
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-900 uppercase mb-2 block">Available Locations</label>
                        {availableLocations.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                                {availableLocations.map((loc: any, idx: number) => {
                                    const isSelected = selectedSite === loc;
                                    return (
                                        <button 
                                            key={idx} 
                                            onClick={() => setSelectedSite(loc)}
                                            className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between transition-all duration-200 ${isSelected ? 'bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white border-transparent hover:bg-white hover:border-slate-300 hover:shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{loc.facility || loc.city}</div>
                                                    <div className="text-xs font-normal text-slate-500">{loc.city}, {loc.state}</div>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-sm text-slate-500 italic text-center">
                                No available locations found. <br/>All sites for this trial may already be claimed.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">Cancel</button>
                        <button 
                            onClick={confirmClaim} 
                            disabled={actionLoading || availableLocations.length === 0} 
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {actionLoading ? "Processing..." : "Confirm & Claim"}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}