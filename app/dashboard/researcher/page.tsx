"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Plus, Search, MapPin, Trash2, Edit3, ChevronRight, BarChart3, 
  Building2, AlertCircle, Clock, Check, HelpCircle, X, Send, 
  CheckSquare, Square, Users, Phone, Calendar, CheckCircle2, FlaskConical
} from 'lucide-react';
import Link from 'next/link';

// ------------------------------------------------------------------
// HELPER: LOCATION KEY GENERATOR (PRESERVED)
// ------------------------------------------------------------------
const getLocationKey = (loc: any) => {
  if (!loc) return "null-loc";
  const c = (loc.city || "").trim().toLowerCase();
  const s = (loc.state || "").trim().toLowerCase();
  const f = (loc.facility || "").trim().toLowerCase(); 
  return `${c}|${s}|${f}`;
};

export default function ResearcherOverview() {
  const router = useRouter();
  
  // --- CORE STATE ---
  const [profile, setProfile] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- CLAIMING/SEARCH STATE ---
  const [claimingMode, setClaimingMode] = useState(false); 
  const [claimQuery, setClaimQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); 
  const [hasSearched, setHasSearched] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<any>(null);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [selectedSites, setSelectedSites] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // --- SUPPORT STATE ---
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState('missing_trial');
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);

  // ------------------------------------------------------------------
  // DATA FETCHING (FIXED TO PERSIST SUBMISSION VIEW)
  // ------------------------------------------------------------------
  const fetchDashboardData = useCallback(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResponse, memberResponse] = await Promise.all([
          supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('team_members').select(`*, researcher_profiles(*)`).eq('user_id', user.id).maybeSingle()
      ]);

      const activeProfile = profileResponse.data || memberResponse.data?.researcher_profiles;
      if (!activeProfile) return;

      setProfile(activeProfile);
      setIsOwner(!!profileResponse.data);

      // --- PERSISTENCE FIX: Check specific DB status ---
      if (!activeProfile.is_verified && activeProfile.is_submitted) {
          setIsSubmitted(true);
      }

      let allowedClaimIds: string[] | null = null; 
      if (memberResponse.data && memberResponse.data.role !== 'admin') {
          const { data: perms } = await supabase.from('claim_permissions').select('claim_id').eq('team_member_id', memberResponse.data.id);
          allowedClaimIds = perms?.map(p => String(p.claim_id)) || [];
      }

      let claimsQuery = supabase.from('claimed_trials').select(`*, trials (*)`).eq('researcher_id', activeProfile.id);
      if (allowedClaimIds !== null) {
          claimsQuery = claimsQuery.in('id', allowedClaimIds);
      }

      const { data: claims } = await claimsQuery;
      
      if (claims) {
          const formatted = await Promise.all(claims.map(async (c: any) => {
                const { data: leads } = await supabase.from('leads').select('id, site_status').eq('trial_id', c.nct_id).eq('site_facility', c.site_location?.facility).eq('site_city', c.site_location?.city).eq('site_state', c.site_location?.state);
                
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
                    const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('lead_id', leadIds).eq('sender_role', 'patient').eq('is_read', false);
                    unreadCount = msgCount || 0;
                }
                
                return { 
                    ...c.trials, 
                    claim_id: String(c.id), 
                    claim_status: c.status, 
                    site_location: c.site_location, 
                    stats, 
                    unread_count: unreadCount 
                };
          }));
          setMyTrials(formatted);
      }
      setLoading(false);
  }, []);

  useEffect(() => { 
      fetchDashboardData(); 
  }, [fetchDashboardData]);

  // Realtime Sync
  useEffect(() => {
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: "sender_role=eq.patient" }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardData]);


  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------
  const searchForTrial = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSearchLoading(true); 
    setHasSearched(false);
    const { data } = await supabase.from('trials').select('*').or(`nct_id.ilike.%${claimQuery}%,title.ilike.%${claimQuery}%`).limit(5);
    setSearchResults(data || []); 
    setSearchLoading(false); 
    setHasSearched(true);
  };

  const initiateClaim = async (trial: any) => { 
      setSelectedTrial(trial); 
      setSelectedSites([]); 
      setAvailableLocations([]); 
      setIsModalOpen(true);
      const allLocations = trial.locations || [];
      const { data: existingClaims } = await supabase.from('claimed_trials').select('site_location').eq('researcher_id', profile.id).eq('nct_id', trial.nct_id);
      const claimedSet = new Set(existingClaims?.map((c: any) => getLocationKey(c.site_location)) || []);
      const available = allLocations.filter((loc: any) => !claimedSet.has(getLocationKey(loc)));
      setAvailableLocations(available);
  };
  
  const toggleSite = (loc: any) => {
      const key = getLocationKey(loc);
      if (selectedSites.some(s => getLocationKey(s) === key)) {
          setSelectedSites(prev => prev.filter(s => getLocationKey(s) !== key));
      } else {
          setSelectedSites(prev => [...prev, loc]);
      }
  };

  const confirmClaim = async () => {
    if (!selectedTrial || !profile || selectedSites.length === 0) return;
    setActionLoading(true);
    // Trials are initially pending until the PI submits the whole application
    const status = 'pending_verification'; 
    
    try {
        const promises = selectedSites.map(site => 
            supabase.from('claimed_trials').insert({ 
                nct_id: selectedTrial.nct_id, 
                researcher_id: profile.id, 
                status: status, 
                site_location: site 
            })
        );
        await Promise.all(promises);
        
        // --- FIX: Refresh data locally instead of reloading window ---
        await fetchDashboardData();
        setIsModalOpen(false);
        setClaimQuery("");
        setSearchResults([]);
    } catch (err: any) { 
        alert("Error: " + err.message); 
    } finally { 
        setActionLoading(false); 
    }
  };

  // --- FINAL SUBMISSION LOGIC ---
  const handleFinalSubmit = async () => {
      if (myTrials.length === 0) return;
      setActionLoading(true);
      
      const { error } = await supabase
        .from('researcher_profiles')
        .update({ is_submitted: true })
        .eq('id', profile.id);
      
      if (!error) {
          setIsSubmitted(true);
      } else {
          alert("Submission failed. Please contact support.");
      }
      setActionLoading(false);
  };

  const removeClaim = async (claimId: string) => {
    if(!confirm("Remove study?")) return;
    const { error } = await supabase.from('claimed_trials').delete().eq('id', claimId);
    if (!error) setMyTrials(myTrials.filter(t => t.claim_id !== claimId));
  };

  const submitTicket = async () => {
      setSendingTicket(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_tickets').insert({ user_id: user?.id, researcher_name: `${profile.first_name} ${profile.last_name}`, researcher_email: profile.email, category: supportCategory, subject: `Support: ${supportCategory}`, message: supportMessage });
      if (!error) { alert("Sent!"); setIsSupportOpen(false); setSupportMessage(""); }
      setSendingTicket(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  // ------------------------------------------------------------------
  // RENDER: UNVERIFIED VIEW (RESTORED BEAUTIFUL UI)
  // ------------------------------------------------------------------
  if (profile && !profile.is_verified) {
    if (isSubmitted) return (
      <div className="flex flex-col items-center justify-center pt-20 p-6 text-center animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <Check className="h-12 w-12" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Application Submitted</h2>
        <p className="text-slate-500 text-lg mb-10 leading-relaxed max-w-lg">We have received your request for <strong>{myTrials.length} studies</strong>. <br/>Our admin team is currently reviewing your credentials.</p>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 text-left max-w-xl w-full shadow-2xl shadow-slate-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Building2 className="h-24 w-24" />
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Queued for Review:</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                {myTrials.map(c => (
                    <div key={c.claim_id} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all duration-300">
                        <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 leading-snug">{c.title}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );

    return (
      <div className="max-w-4xl mx-auto pt-10 p-8 animate-in fade-in duration-700">
        <div className="text-center mb-16">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100/50 animate-bounce-slow">
                <Building2 className="h-10 w-10" />
            </div>
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Welcome, {profile?.first_name}</h1>
            <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto">Build your researcher profile by adding the clinical studies you manage.</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 mb-10 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">1. Search & Add Studies</h3>
                <button onClick={() => setIsSupportOpen(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors">Can't find a trial?</button>
            </div>
            
            <div className="relative mb-10">
                <Search className="absolute left-6 top-6 h-7 w-7 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Enter NCT ID or Title..." 
                    className="w-full pl-16 p-6 bg-slate-50 border-2 border-transparent rounded-3xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 text-xl placeholder:text-slate-300" 
                    value={claimQuery} 
                    onChange={(e) => { setClaimQuery(e.target.value); setHasSearched(false); }} 
                />
                <button onClick={searchForTrial} className="absolute right-4 top-4 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-200">Search</button>
            </div>

            {searchResults.length > 0 && (
                <div className="space-y-4 mb-4 animate-in slide-in-from-top-4 duration-500">
                    {searchResults.map((trial) => (
                        <div key={trial.nct_id} className="p-6 border border-slate-100 bg-slate-50/50 rounded-3xl flex justify-between items-center hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                            <div>
                                <div className="font-mono text-[10px] font-black text-slate-300 mb-1 group-hover:text-indigo-400">{trial.nct_id}</div>
                                <h4 className="font-bold text-slate-900 text-lg leading-tight max-w-md">{trial.title}</h4>
                            </div>
                            <button onClick={() => initiateClaim(trial)} className="bg-white text-slate-900 border-2 border-slate-100 px-6 py-3 rounded-2xl font-black text-xs hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">Select Site</button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">2. Review Your List ({myTrials.length})</h3>
                {myTrials.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ready to submit</span>
                    </div>
                )}
            </div>

            {myTrials.length === 0 ? (
                <div className="text-center py-20 border-4 border-dashed border-slate-50 rounded-[2.5rem]">
                    <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-300 font-bold italic">Your list is currently empty. Search above to begin.</p>
                </div>
            ) : (
                <div className="space-y-4 mb-10">
                    {myTrials.map((t) => (
                        <div key={t.claim_id} className="p-6 bg-slate-50/80 border border-slate-200 rounded-3xl flex justify-between items-center group hover:bg-white hover:border-indigo-100 transition-all">
                            <div>
                                <h4 className="font-bold text-slate-900 text-base truncate max-w-lg">{t.title}</h4>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="font-mono text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{t.nct_id}</span>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.site_location?.city}</span>
                                </div>
                            </div>
                            <button onClick={() => removeClaim(t.claim_id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-10 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={handleFinalSubmit} 
                    disabled={myTrials.length === 0 || actionLoading} 
                    className="bg-slate-900 text-white px-12 py-6 rounded-3xl font-black text-xl shadow-2xl shadow-slate-300 hover:bg-indigo-600 disabled:opacity-20 disabled:grayscale transition-all transform hover:-translate-y-1 flex items-center gap-4 active:scale-95"
                >
                    {actionLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <>Submit Application <ChevronRight className="h-7 w-7" /></>}
                </button>
            </div>
        </div>

        {isSupportOpen && <SupportModal setIsSupportOpen={setIsSupportOpen} supportCategory={supportCategory} setSupportCategory={setSupportCategory} supportMessage={supportMessage} setSupportMessage={setSupportMessage} submitTicket={submitTicket} sendingTicket={sendingTicket} />}
        {isModalOpen && <ClaimModal setIsModalOpen={setIsModalOpen} selectedTrial={selectedTrial} availableLocations={availableLocations} getLocationKey={getLocationKey} selectedSites={selectedSites} toggleSite={toggleSite} confirmClaim={confirmClaim} actionLoading={actionLoading} />}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: VERIFIED DASHBOARD VIEW (PRESERVED)
  // ------------------------------------------------------------------
  return (
    <div className="p-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
            <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-slate-400" />
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{profile?.company_name}</p>
            </div>
          </div>
          {!claimingMode && isOwner && (
            <button 
                onClick={() => setClaimingMode(true)} 
                className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
                <Plus className="h-5 w-5" /> Add New Study
            </button>
          )}
        </header>

        {claimingMode ? (
            <div className="max-w-3xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-300/50 border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-2xl text-slate-900 tracking-tight">Add Another Study</h3>
                        <button onClick={() => setIsSupportOpen(true)} className="text-xs font-bold text-indigo-600">Can't find it?</button>
                    </div>
                    <div className="relative mb-10">
                        <Search className="absolute left-6 top-6 h-6 w-6 text-slate-300" />
                        <input type="text" placeholder="Search by NCT or Title..." className="w-full pl-16 p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 font-bold text-slate-700 text-lg transition-all" value={claimQuery} onChange={(e) => { setClaimQuery(e.target.value); setHasSearched(false); }} autoFocus />
                        <button onClick={searchForTrial} className="absolute right-4 top-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all">Search</button>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {searchResults.map((trial) => (
                            <div key={trial.nct_id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-indigo-300 hover:shadow-lg transition-all">
                                <div><div className="font-mono text-[10px] font-black text-slate-300 mb-1">{trial.nct_id}</div><h4 className="font-bold text-slate-900 text-lg leading-tight">{trial.title}</h4></div>
                                <button onClick={() => initiateClaim(trial)} className="px-6 py-3 bg-slate-50 text-slate-900 font-black text-xs rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Select Site</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setClaimingMode(false)} className="mt-10 text-slate-400 text-sm font-black uppercase tracking-widest block mx-auto hover:text-slate-600 transition-colors">Cancel</button>
                </div>
            </div>
        ) : (
            <div className="space-y-8">
                {myTrials.length > 0 ? myTrials.map((trial) => (
                    <div key={trial.claim_id} className="group bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 overflow-hidden relative">
                        <div className="flex flex-col lg:flex-row">
                            <div className="flex-1 p-10 lg:pl-12 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-lg border border-slate-200 tracking-wider">{trial.nct_id}</span>
                                        {trial.unread_count > 0 && <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-lg border border-red-100 flex items-center gap-2 animate-in zoom-in"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div> {trial.unread_count} New Message{trial.unread_count > 1 ? 's' : ''}</span>}
                                        {trial.claim_status !== 'approved' && <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-lg border border-amber-100 flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /> Pending Verification</span>}
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors"><Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&claim_id=${trial.claim_id}`} className="hover:underline decoration-4 underline-offset-4 decoration-indigo-500/30">{trial.title}</Link></h3>
                                    <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-500" /> {trial.site_location?.city || 'Remote'}, {trial.site_location?.state || 'USA'}</span>
                                        <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-indigo-500" /> Phase {trial.phase || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="mt-10 flex items-center gap-4">
                                    {isOwner && (
                                        <>
                                            <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=profile&claim_id=${trial.claim_id}`} className="p-4 text-slate-400 border-2 border-slate-50 rounded-2xl hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"><Edit3 className="h-5 w-5" /></Link>
                                            <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=analytics&claim_id=${trial.claim_id}`} className="p-4 text-slate-400 border-2 border-slate-50 rounded-2xl hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"><BarChart3 className="h-5 w-5" /></Link>
                                        </>
                                    )}
                                    <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&claim_id=${trial.claim_id}`} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-0.5 active:scale-95">Manage Trial <ChevronRight className="h-5 w-5" /></Link>
                                </div>
                            </div>
                            
                            <div className="w-full lg:w-[450px] bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 p-10 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center group/stat hover:border-blue-400 transition-all"><div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 group-hover/stat:scale-110 transition-transform"><Users className="h-4 w-4" /> New</div><div className="text-3xl font-black text-slate-900">{trial.stats?.new || 0}</div></div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center group/stat hover:border-amber-400 transition-all"><div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 group-hover/stat:scale-110 transition-transform"><Phone className="h-4 w-4" /> Screening</div><div className="text-3xl font-black text-slate-900">{trial.stats?.screening || 0}</div></div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center group/stat hover:border-purple-400 transition-all"><div className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 group-hover/stat:scale-110 transition-transform"><Calendar className="h-4 w-4" /> Scheduled</div><div className="text-3xl font-black text-slate-900">{trial.stats?.scheduled || 0}</div></div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center group/stat hover:border-emerald-400 transition-all"><div className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 group-hover/stat:scale-110 transition-transform"><CheckCircle2 className="h-4 w-4" /> Enrolled</div><div className="text-3xl font-black text-slate-900">{trial.stats?.enrolled || 0}</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
                            <Search className="h-12 w-12" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No active studies</h3>
                        <p className="text-slate-400 font-bold mb-10 max-w-sm mx-auto">Search our database and claim your site to start recruiting candidates today.</p>
                        {isOwner && <button onClick={() => setClaimingMode(true)} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-indigo-600 transition-all transform hover:-translate-y-1">Find Your Study</button>}
                    </div>
                )}
            </div>
        )}

        {isSupportOpen && <SupportModal setIsSupportOpen={setIsSupportOpen} supportCategory={supportCategory} setSupportCategory={setSupportCategory} supportMessage={supportMessage} setSupportMessage={setSupportMessage} submitTicket={submitTicket} sendingTicket={sendingTicket} />}
        {isModalOpen && <ClaimModal setIsModalOpen={setIsModalOpen} selectedTrial={selectedTrial} availableLocations={availableLocations} getLocationKey={getLocationKey} selectedSites={selectedSites} toggleSite={toggleSite} confirmClaim={confirmClaim} actionLoading={actionLoading} />}
    </div>
  );
}

// ------------------------------------------------------------------
// SUB-COMPONENTS (PRESERVED)
// ------------------------------------------------------------------

function SupportModal({ setIsSupportOpen, supportCategory, setSupportCategory, supportMessage, setSupportMessage, submitTicket, sendingTicket }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-8"><h3 className="font-black text-2xl text-slate-900 tracking-tight">Contact Support</h3><button onClick={() => setIsSupportOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors p-2"><X className="h-6 w-6" /></button></div>
            <div className="space-y-6">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reason for inquiry</label><select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all" value={supportCategory} onChange={(e) => setSupportCategory(e.target.value)}><option value="missing_trial">I can't find a specific trial</option><option value="claim_dispute">My trial is already claimed by someone else</option><option value="other">Other Issue</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Additional Details</label><textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm h-40 resize-none transition-all" placeholder="Tell us more about the issue..." value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} /></div>
                <button onClick={submitTicket} disabled={sendingTicket || !supportMessage} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-100">{sendingTicket ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Request"}</button>
            </div>
        </div>
    </div>
  );
}

function ClaimModal({ setIsModalOpen, selectedTrial, availableLocations, getLocationKey, selectedSites, toggleSite, confirmClaim, actionLoading }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="shrink-0 mb-8 text-center"><div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><MapPin className="h-8 w-8" /></div><h3 className="font-black text-2xl text-slate-900 tracking-tight">Select Site Location</h3><p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest">{selectedTrial?.nct_id}</p></div>
            <div className="flex-1 overflow-y-auto mb-10 border-2 border-slate-50 rounded-[2rem] bg-slate-50/30 p-4 space-y-2 custom-scrollbar">
                {availableLocations.length === 0 ? <div className="text-center py-12 text-slate-300 font-bold italic">No new locations available to claim.</div> : availableLocations.map((loc: any, idx: number) => {
                    const key = getLocationKey(loc);
                    const isSelected = selectedSites.some((s:any) => getLocationKey(s) === key);
                    return (
                        <button key={idx} onClick={() => toggleSite(loc)} className={`w-full text-left p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 transform ${isSelected ? 'bg-white shadow-xl ring-2 ring-indigo-500 scale-[1.02]' : 'hover:bg-white/60'}`}>
                            <div className={`mt-0.5 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-200'}`}>{isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}</div>
                            <div><div className={`font-black text-base ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{loc.facility || loc.city}</div><div className={`text-xs font-bold mt-1 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{loc.city}, {loc.state}</div></div>
                        </button>
                    );
                })}
            </div>
            <div className="flex gap-4 shrink-0"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border-2 border-slate-100 bg-white rounded-2xl font-black text-sm text-slate-400 hover:text-slate-600 hover:border-slate-200 transition-all uppercase tracking-widest">Cancel</button><button onClick={confirmClaim} disabled={actionLoading || selectedSites.length === 0} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 shadow-2xl disabled:opacity-30 transition-all flex items-center justify-center gap-3 uppercase tracking-widest">{actionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : `Claim ${selectedSites.length > 0 ? `(${selectedSites.length})` : ''}`}</button></div>
        </div>
    </div>
  );
}