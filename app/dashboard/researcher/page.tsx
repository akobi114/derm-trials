"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, LayoutDashboard, Settings, LogOut, CheckCircle2, 
  Plus, Search, MapPin, Users, Trash2, Edit3, CreditCard, 
  ChevronRight, BarChart3, Building2, AlertCircle, Clock, Check,
  MessageSquare, FlaskConical, Layout, Phone, Calendar, Crown, Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function ResearcherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [tier, setTier] = useState<'free' | 'pro'>('free'); // Default to free
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [claimingMode, setClaimingMode] = useState(false); 
  const [claimQuery, setClaimQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); 

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

      // 1. Get Profile & Tier
      const { data: profileData } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        // READ TIER FROM DB (Default to free if null)
        setTier(profileData.tier === 'pro' ? 'pro' : 'free');
        
        const { data: claims } = await supabase
          .from('claimed_trials')
          .select(`*, trials (*)`)
          .eq('researcher_id', profileData.id);
        
        if (claims) {
            // Advanced Fetch: Get specific counts for the funnel
            const formatted = await Promise.all(claims.map(async (c: any) => {
                const { data: leads } = await supabase
                    .from('leads')
                    .select('id, site_status')
                    .eq('trial_id', c.nct_id)
                    .eq('site_city', c.site_location?.city) 
                    .eq('site_state', c.site_location?.state);

                const stats = {
                    new: leads?.filter((l: any) => l.site_status === 'New').length || 0,
                    screening: leads?.filter((l: any) => l.site_status === 'Contacted').length || 0,
                    scheduled: leads?.filter((l: any) => l.site_status === 'Scheduled').length || 0,
                    enrolled: leads?.filter((l: any) => l.site_status === 'Enrolled').length || 0,
                    total: leads?.length || 0
                };

                let unreadCount = 0;
                if (leads && leads.length > 0) {
                    const leadIds = leads.map((l: any) => l.id);
                    const { count: msgCount } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .in('lead_id', leadIds)
                        .eq('sender_role', 'patient')
                        .eq('is_read', false);
                    unreadCount = msgCount || 0;
                }

                return {
                    ...c.trials, 
                    claim_id: c.id, 
                    claim_status: c.status,
                    site_location: c.site_location,
                    stats,
                    unread_count: unreadCount
                };
            }));
            setMyTrials(formatted);
        }
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      router.push('/'); 
  };

  const searchForTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    const { data } = await supabase.from('trials').select('*').or(`nct_id.ilike.%${claimQuery}%,title.ilike.%${claimQuery}%`).limit(5);
    setSearchResults(data || []);
    setSearchLoading(false);
  };

  const initiateClaim = async (trial: any) => { 
      setSelectedTrial(trial);
      setSelectedSite(null);
      setAvailableLocations([]);
      setIsModalOpen(true);

      const allLocations = trial.locations || [];
      const { data: existingClaims } = await supabase
        .from('claimed_trials')
        .select('site_location')
        .eq('nct_id', trial.nct_id);

      const claimedKeys = new Set(existingClaims?.map((c: any) => 
        `${c.site_location?.city}-${c.site_location?.state}`
      ) || []);
      
      const available = allLocations.filter((loc: any) => 
        !claimedKeys.has(`${loc.city}-${loc.state}`)
      );

      setAvailableLocations(available);
      if (available.length > 0) setSelectedSite(available[0]);
  };
  
  const confirmClaim = async () => {
    if (!selectedTrial || !profile) return;
    if (availableLocations.length > 0 && !selectedSite) {
        alert("Please select which site location you are managing.");
        return;
    }

    setActionLoading(true);
    const status = profile.is_verified ? 'approved' : 'pending_verification';

    const { data, error } = await supabase
        .from('claimed_trials')
        .insert({ 
            nct_id: selectedTrial.nct_id, 
            researcher_id: profile.id, 
            status: status,
            site_location: selectedSite || {}
        })
        .select()
        .single();

    if (error) { 
        if (error.code === '23505') alert("This location is already claimed.");
        else alert("Error: " + error.message); 
    } else { 
        window.location.reload();
    }
    setActionLoading(false);
  };

  const removeClaim = async (claimId: string) => {
    if(!confirm("Remove this study from your application?")) return;
    const { error } = await supabase.from('claimed_trials').delete().eq('id', claimId);
    if (!error) {
        setMyTrials(myTrials.filter(t => t.claim_id !== claimId));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  // --- VIEW 1: UNVERIFIED ---
  if (profile && !profile.is_verified) {
      if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="h-10 w-10" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">We have received your request for <strong>{myTrials.length} studies</strong>. <br/>Our admin team is reviewing your credentials.</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Queued for Review:</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {myTrials.map(c => (
                                <div key={c.claim_id} className="flex items-center gap-2 text-sm font-bold text-slate-700"><Clock className="h-4 w-4 text-amber-500 shrink-0" /><span className="truncate">{c.title}</span></div>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleLogout} className="mt-8 text-sm text-slate-400 font-bold hover:text-slate-600">Sign Out</button>
                </div>
            </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-12 p-6 font-sans">
            <div className="max-w-3xl w-full">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Building2 className="h-8 w-8" /></div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-3">Welcome, {profile?.first_name}</h1>
                    <p className="text-slate-500 text-lg">Build your site profile. Add all the studies you are currently conducting.</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8">
                    <h3 className="font-bold text-slate-900 mb-4">1. Search & Add Studies</h3>
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="text" placeholder="Enter NCT ID (e.g. NCT04345919) or Title..." className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" value={claimQuery} onChange={(e) => setClaimQuery(e.target.value)} />
                        <button onClick={searchForTrial} disabled={searchLoading || !claimQuery} className="absolute right-3 top-2.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">{searchLoading ? "..." : "Search"}</button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-top-2">
                            {searchResults.map((trial) => (
                                <div key={trial.nct_id} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="font-mono text-[10px] text-slate-400 mb-1">{trial.nct_id}</div>
                                        <h4 className="font-bold text-slate-900 text-sm">{trial.title}</h4>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {trial.locations?.length || 0} Sites Available</div>
                                    </div>
                                    <button onClick={() => initiateClaim(trial)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100">Select Site</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900">2. Review Your List ({myTrials.length})</h3>
                        {myTrials.length > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Ready to submit</span>}
                    </div>
                    {myTrials.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-slate-400 italic text-sm">Your list is empty. Search above to add studies.</div>
                    ) : (
                        <div className="space-y-3 mb-8">
                            {myTrials.map((t) => (
                                <div key={t.claim_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm truncate max-w-md">{t.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="font-mono text-[10px] text-slate-400">{t.nct_id}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.site_location?.city}, {t.site_location?.state}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeClaim(t.claim_id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button 
                            onClick={() => setIsSubmitted(true)} 
                            disabled={myTrials.length === 0}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            Submit Application <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
            {/* ONBOARDING MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden">
                        <h3 className="font-bold text-lg mb-2">Claim {selectedTrial?.nct_id}</h3>
                        <p className="text-sm text-slate-500 mb-6">Select your site location.</p>
                        <div className="mb-6 space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                            {availableLocations.map((loc: any, idx: number) => (
                                <button key={idx} onClick={() => setSelectedSite(loc)} className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${selectedSite === loc ? 'bg-white ring-1 ring-indigo-600 shadow-md' : 'hover:bg-white hover:shadow-sm'}`}>
                                    <div><div className="font-bold text-slate-700">{loc.facility || loc.city}</div><div className="text-xs text-slate-500">{loc.city}, {loc.state}</div></div>
                                    {selectedSite === loc && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600">Cancel</button>
                            <button onClick={confirmClaim} disabled={actionLoading || !selectedSite} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg disabled:opacity-50">{actionLoading ? "Processing..." : "Confirm & Claim"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- VIEW 2: VERIFIED DASHBOARD (Main App) ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 h-20 flex items-center border-b border-slate-100">
          <Link href="/" className="font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
            Derm<span className="text-indigo-600">Trials</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/researcher" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm bg-indigo-50 text-indigo-700">
            <LayoutDashboard className="h-5 w-5" /> Overview
          </Link>
          <Link href="/dashboard/researcher/billing" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <CreditCard className="h-5 w-5" /> Billing & Invoices
          </Link>
          <Link href="/dashboard/researcher/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Settings className="h-5 w-5" /> Settings
          </Link>
        </nav>

        {/* --- PLAN WIDGET --- */}
        <div className="px-4 mb-2">
            <div className={`p-4 rounded-xl border ${tier === 'pro' ? 'bg-gradient-to-br from-indigo-900 to-indigo-800 text-white border-indigo-700 shadow-lg' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${tier === 'pro' ? 'text-indigo-200' : 'text-slate-400'}`}>Current Plan</span>
                    {tier === 'pro' && <Crown className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <div className={`text-lg font-extrabold ${tier === 'pro' ? 'text-white' : 'text-slate-900'}`}>
                        {tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                    </div>
                    {tier === 'pro' && <span className="bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded">PRO</span>}
                </div>
                {tier === 'free' ? (
                    <Link href="/dashboard/researcher/billing" className="block w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg text-center transition-colors">
                        Upgrade Now
                    </Link>
                ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-200">
                        <Sparkles className="h-3 w-3" /> All Features Active
                    </div>
                )}
            </div>
        </div>

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

        {/* CLAIM SEARCH UI (FOR VERIFIED USERS) */}
        {claimingMode ? (
            <div className="max-w-2xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 text-lg">Add Another Study</h3>
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="text" placeholder="Search by NCT ID or Title..." className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" value={claimQuery} onChange={(e) => setClaimQuery(e.target.value)} autoFocus />
                        <button onClick={searchForTrial} disabled={searchLoading} className="absolute right-3 top-2.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">{searchLoading ? "..." : "Search"}</button>
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
                        {searchResults.length === 0 && claimQuery && !searchLoading && <div className="text-center text-slate-400 italic">No trials found.</div>}
                    </div>
                    <button onClick={() => setClaimingMode(false)} className="mt-8 text-slate-400 text-sm hover:text-slate-600 font-medium block mx-auto">Cancel</button>
                </div>
            </div>
        ) : (
            /* --- UPDATED: FULL-WIDTH HERO CARDS (NO SIDE BAR) --- */
            <div className="space-y-6">
                {myTrials.length > 0 ? myTrials.map((trial) => (
                    <div key={trial.claim_id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                        <div className="flex flex-col md:flex-row">
                            
                            {/* LEFT: MAIN INFO */}
                            <div className="flex-1 p-8 pl-10 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{trial.nct_id}</span>
                                        {/* UNREAD MESSAGES BADGE */}
                                        {trial.unread_count > 0 && (
                                            <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 flex items-center gap-1 animate-in zoom-in">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></div> {trial.unread_count} Unread Messages
                                            </span>
                                        )}
                                        {/* PENDING STATUS BADGE */}
                                        {trial.claim_status !== 'approved' && (
                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" /> Verification Pending
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                        <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads`} className="hover:underline decoration-2 underline-offset-2">
                                            {trial.title}
                                        </Link>
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {trial.site_location?.city || 'Remote'}, {trial.site_location?.state || 'USA'}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> {trial.phase || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <Link 
                                        href={`/dashboard/researcher/study/${trial.nct_id}?tab=profile`}
                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-200 hover:border-indigo-200"
                                        title="Edit Page"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Link>
                                    <Link 
                                        href={`/dashboard/researcher/study/${trial.nct_id}?tab=analytics`}
                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-200 hover:border-indigo-200"
                                        title="Analytics"
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                    </Link>
                                    <Link 
                                        href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads`}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                                    >
                                        Manage Study <ChevronRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>

                            {/* RIGHT: PIPELINE MINI-VIEW */}
                            <div className="w-full md:w-96 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* NEW */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="h-3 w-3" /> New</div>
                                        <div className="text-xl font-extrabold text-slate-900">{trial.stats?.new || 0}</div>
                                    </div>
                                    
                                    {/* SCREENING */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="h-3 w-3" /> Screening</div>
                                        <div className="text-xl font-extrabold text-slate-900">{trial.stats?.screening || 0}</div>
                                    </div>

                                    {/* SCHEDULED */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Scheduled</div>
                                        <div className="text-xl font-extrabold text-slate-900">{trial.stats?.scheduled || 0}</div>
                                    </div>

                                    {/* ENROLLED */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Enrolled</div>
                                        <div className="text-xl font-extrabold text-slate-900">{trial.stats?.enrolled || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                            <Search className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No active studies</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">Search our database of 400,000+ clinical trials and claim yours to start recruiting active candidates today.</p>
                        <button onClick={() => setClaimingMode(true)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            Find Your Study
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* REUSED MODAL FOR VERIFIED USERS */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden">
                    <h3 className="font-bold text-lg mb-2">Claim {selectedTrial?.nct_id}</h3>
                    <p className="text-sm text-slate-500 mb-6">Select your site location.</p>
                    <div className="mb-6 space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                        {availableLocations.map((loc: any, idx: number) => (
                            <button key={idx} onClick={() => setSelectedSite(loc)} className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${selectedSite === loc ? 'bg-white ring-1 ring-indigo-600 shadow-md' : 'hover:bg-white hover:shadow-sm'}`}>
                                <div><div className="font-bold text-slate-700">{loc.facility || loc.city}</div><div className="text-xs text-slate-500">{loc.city}, {loc.state}</div></div>
                                {selectedSite === loc && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600">Cancel</button>
                        <button onClick={confirmClaim} disabled={actionLoading || !selectedSite} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg disabled:opacity-50">{actionLoading ? "Processing..." : "Confirm & Claim"}</button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}