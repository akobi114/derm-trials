"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, MapPin, Edit3, BarChart3, Lock, Search, 
  Building2, Filter, ArrowUpDown, Tag, Plus, 
  ShieldCheck, Info, Stethoscope, Wallet, HelpCircle,
  Users, Activity, ChevronRight, User
} from 'lucide-react';
import Link from 'next/link';
import SupportModal from './components/SupportModal';

function ResearcherDashboardContent() {
  const pathname = usePathname();
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [userMemberData, setUserMemberData] = useState<any>(null);
  const [orgCredits, setOrgCredits] = useState(0);
  const [isOrgVerified, setIsOrgVerified] = useState(false);
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  const [isPending, setIsPending] = useState(false);
  
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [allPIs, setAllPIs] = useState<any[]>([]);
  
  const [selectedInvId, setSelectedInvId] = useState<string>('all');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'unread' | 'nct'>('unread');

  const currentView = useMemo(() => {
    if (pathname.includes('/team')) return 'team';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/organization-settings')) return 'organization';
    return 'overview';
  }, [pathname]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. FETCH MEMBER CONTEXT
      let { data: memberData } = await supabase
        .from('team_members')
        .select('*, organizations (*)')
        .eq('user_id', user.id)
        .maybeSingle(); 

      if (!memberData) {
        const { data: profileCheck } = await supabase
          .from('researcher_profiles')
          .select('*, organizations:organization_id(*)')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileCheck?.organization_id) {
          memberData = {
            ...profileCheck,
            organizations: profileCheck.organizations,
            role: profileCheck.role || 'oam',
            status: profileCheck.is_verified ? 'verified' : 'pending',
            is_active: true,
            organization_id: profileCheck.organization_id,
            researcher_id: profileCheck.id 
          };
        } else {
            router.push('/dashboard/researcher/library');
            return;
        }
      }

      if (memberData.status !== 'verified' || !memberData.is_active) setIsPending(true);

      setUserMemberData(memberData);
      setOrgCredits(memberData.organizations?.credit_balance || 0);
      setIsOrgVerified(memberData.organizations?.is_verified || false);
      setTier(memberData.organizations?.billing_tier === 'pro' ? 'pro' : 'free');
      
      if (selectedInvId === 'all' && (memberData.role === 'Clinical Investigator' || memberData.role === 'Principal Investigator')) {
        setSelectedInvId(memberData.id);
      }

      // 2. FETCH ROSTER
      const { data: roster } = await supabase
        .from('team_members')
        .select('id, first_name, last_name, role')
        .eq('organization_id', memberData.organization_id)
        .eq('is_active', true);
      
      const pisOnly = roster?.filter((r: any) => r.role?.includes('Investigator')) || [];
      setAllPIs(pisOnly);

      // 3. FETCH CLAIMS
      let claimsQuery = supabase
        .from('claimed_trials')
        .select(`*, trials (nct_id, official_title, condition, brief_summary)`)
        .eq('organization_id', memberData.organization_id);

      const { data: claims } = await claimsQuery;

      if (claims && claims.length > 0) {
          
          // 4. FETCH LIVE STATUS
          const locationIds = claims.map((c: any) => c.site_location?.id).filter(Boolean);
          let statusMap: Record<string, string> = {};
          
          if (locationIds.length > 0) {
              const { data: locData } = await supabase
                  .from('trial_locations')
                  .select('id, status')
                  .in('id', locationIds);
              
              locData?.forEach((l: any) => {
                  statusMap[l.id] = l.status;
              });
          }

          // 5. Fetch Assignments
          const { data: assignments } = await supabase
            .from('trial_assignments')
            .select('trial_id, location_id, role_on_trial, team_member_id')
            .eq('organization_id', memberData.organization_id);

          // 6. Apply Filter
          let filteredClaims = claims;
          if (selectedInvId !== 'all') {
             const assignedTrialIds = assignments
                ?.filter((a: any) => a.team_member_id === selectedInvId)
                .map((a: any) => a.trial_id) || [];
             filteredClaims = claims.filter((c: any) => assignedTrialIds.includes(c.nct_id));
          }

          // 7. Fetch Leads
          const nctIds = filteredClaims.map((c: any) => c.nct_id);
          const { data: allLeads } = await supabase
            .from('leads')
            .select('id, trial_id, site_status, location_id')
            .in('trial_id', nctIds)
            .eq('organization_id', memberData.organization_id);

          const formatted = filteredClaims.map((c: any) => {
                const globalTrial = c.trials;
                const locId = c.site_location?.id; 
                const liveStatus = statusMap[locId] || c.site_location?.status || 'RECRUITING'; 
                
                const siteLeads = allLeads?.filter((l: any) => l.trial_id === c.nct_id && l.location_id === locId) || [];
                const trialAssignments = assignments?.filter((a: any) => a.trial_id === c.nct_id) || [];
                
                const teamWithRoles = trialAssignments.map((asg: any) => {
                    const member = roster?.find((r: any) => r.id === asg.team_member_id);
                    return member ? { ...member, role_on_trial: asg.role_on_trial } : null;
                }).filter(Boolean);

                return { 
                    ...globalTrial,
                    title: globalTrial.official_title || "Untitled Protocol",
                    claim_id: c.id,
                    location_id: locId,
                    facility: c.site_location?.facility_name || "Main Campus",
                    city: c.site_location?.city,
                    state: c.site_location?.state,
                    status_label: liveStatus, 
                    team: teamWithRoles, 
                    stats: { 
                        new: siteLeads.filter((l: any) => l.site_status === 'New').length, 
                        screening: siteLeads.filter((l: any) => ['Contacted', 'Scheduled'].includes(l.site_status)).length, 
                        enrolled: siteLeads.filter((l: any) => ['Enrolled', 'Randomized'].includes(l.site_status)).length, 
                    },
                    unread_count: 0 
                };
          });

          setMyTrials(formatted);
      } else {
          setMyTrials([]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedInvId, router]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const conditions = useMemo(() => {
      const all = myTrials.map((t: any) => t.condition).filter(Boolean);
      return Array.from(new Set(all));
  }, [myTrials]);

  const toggleCondition = (cond: string) => {
      setSelectedConditions(prev => 
          prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
      );
  };

  const processedTrials = useMemo(() => {
      return myTrials.filter((t: any) => {
            const safeTitle = (t.title || "").toLowerCase();
            const safeNct = (t.nct_id || "").toLowerCase();
            const matchesSearch = safeTitle.includes(searchTerm.toLowerCase()) || 
                                  safeNct.includes(searchTerm.toLowerCase());
            const matchesCondition = selectedConditions.length === 0 || selectedConditions.includes(t.condition);
            return matchesSearch && matchesCondition;
        })
        .sort((a: any, b: any) => {
            if (sortBy === 'unread') return (b.unread_count || 0) - (a.unread_count || 0);
            if (sortBy === 'title') return (a.title || "").localeCompare(b.title || "");
            if (sortBy === 'nct') return (a.nct_id || "").localeCompare(b.nct_id || "");
            return 0;
        });
  }, [myTrials, searchTerm, selectedConditions, sortBy]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-6 lg:p-10 animate-in fade-in duration-500 pb-20 w-full">
        <div className="max-w-[1600px] mx-auto space-y-10">

            {/* HEADER */}
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
                        Clinical <span className="text-indigo-600">Dashboard</span>
                    </h1>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                        <Building2 className="h-4 w-4" />
                        <span>{userMemberData?.organizations?.name || "Clinic Hub"}</span>
                        {tier === 'pro' && <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded ml-2">PRO</span>}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <button 
                        onClick={() => setIsSupportOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                    >
                        <HelpCircle className="h-4 w-4" /> Support
                    </button>

                    <div className="relative w-full sm:w-auto group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search active protocols..." 
                            className="w-full sm:w-80 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* FILTERS */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0">
                        <Filter className="h-3 w-3"/> Investigators:
                    </span>
                    <button 
                        onClick={() => setSelectedInvId('all')}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap shadow-sm ${selectedInvId === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-300' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                        All Studies
                    </button>
                    {allPIs.map((inv: any) => (
                        <button 
                            key={inv.id}
                            onClick={() => setSelectedInvId(inv.id)}
                            className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2 shadow-sm ${selectedInvId === inv.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'}`}
                        >
                            <Stethoscope className="h-3.5 w-3.5" />
                            {inv.first_name} {inv.last_name}
                        </button>
                    ))}
                </div>

                {conditions.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0">
                            <Tag className="h-3 w-3" /> Conditions:
                        </span>
                        {conditions.map((cond: any) => (
                            <button 
                                key={cond} 
                                onClick={() => toggleCondition(cond)} 
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border ${selectedConditions.includes(cond) ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white/60 border-transparent text-slate-400 hover:bg-white hover:border-slate-200'}`}
                            >
                                {cond}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* VERIFICATION ALERT */}
            {userMemberData && !isOrgVerified && (
              <div className="p-8 bg-white border border-amber-100 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-400"></div>
                <div className="flex items-center gap-6 z-10">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight mb-1">Verification Required</h4>
                    <p className="text-sm text-slate-500 font-medium max-w-xl">
                        Your clinic is currently in "Pending" status. Lead contact details and messaging features are locked until our team verifies your credentials.
                    </p>
                  </div>
                </div>
                {userMemberData.is_oam && (
                    <Link 
                        href="/dashboard/researcher/organization-settings" 
                        className="z-10 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        Submit Documents
                    </Link>
                )}
              </div>
            )}

            {/* EMPTY STATE */}
            {processedTrials.length === 0 && selectedInvId === 'all' && !isPending ? (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm border-dashed">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mb-6">
                  <Building2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">No Active Protocols</h2>
                <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                  Your dashboard is empty. Start by adding active clinical trials to your site inventory.
                </p>
                <Link 
                  href="/dashboard/researcher/library"
                  className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Claim Your First Trial
                </Link>
              </div>
            ) : (
                /* TRIALS GRID */
                <div className="space-y-6">
                    {processedTrials.map((trial: any) => {
                        const pis = trial.team.filter((m: any) => m.role_on_trial === 'Principal Investigator');
                        const subPis = trial.team.filter((m: any) => m.role_on_trial === 'Sub-Investigator');

                        return (
                            <div key={trial.claim_id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden relative">
                                <div className="flex flex-col lg:flex-row">
                                    
                                    {/* LEFT: INFO AREA - COMPACT */}
                                    <div className="flex-1 p-6 flex flex-col justify-between relative">
                                        <div>
                                            {/* ID & STATUS */}
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">{trial.nct_id}</span>
                                                
                                                {trial.status_label === 'RECRUITING' ? (
                                                    <span className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Recruiting
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg border border-amber-100 text-[10px] font-black uppercase tracking-widest">
                                                        <Activity className="h-3 w-3" /> {trial.status_label}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* TITLE */}
                                            <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors max-w-3xl">
                                              <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&location_id=${trial.location_id}`} className="hover:underline decoration-2 underline-offset-4 decoration-indigo-200">
                                                {trial.title}
                                              </Link>
                                            </h3>
                                            
                                            {/* METADATA - COMPACT */}
                                            <div className="flex flex-wrap gap-6 mb-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <MapPin className="h-4 w-4 text-slate-300" />
                                                    {trial.facility}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <Tag className="h-4 w-4 text-purple-300" />
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md uppercase tracking-wide text-[10px] font-black">{trial.condition || 'General'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* COMPACT FOOTER ACTIONS & TEAM */}
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6">
                                            {/* LEFT: BUTTONS */}
                                            <div className="flex items-center gap-4 w-full xl:w-auto">
                                                <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&location_id=${trial.location_id}`} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95 whitespace-nowrap">
                                                    View Patient Board <ChevronRight className="h-3 w-3" />
                                                </Link>
                                                <div className="flex gap-2">
                                                    <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=analytics`} className="p-3 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"><BarChart3 className="h-4 w-4" /></Link>
                                                    <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=settings`} className="p-3 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"><Edit3 className="h-4 w-4" /></Link>
                                                </div>
                                            </div>

                                            {/* RIGHT: COMPACT TEAM LIST */}
                                            <div className="flex flex-col gap-2 w-full xl:w-auto xl:items-end">
                                                {pis.length > 0 && (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PI(s)</span>
                                                        <div className="flex flex-wrap gap-1.5 justify-end">
                                                            {pis.map((m: any) => (
                                                                <div key={m.id} className="flex items-center gap-1.5 bg-slate-50 text-slate-700 pl-1 pr-2 py-1 rounded-full border border-slate-100 cursor-default">
                                                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-black text-indigo-600">
                                                                        {m.first_name?.[0]}{m.last_name?.[0]}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold tracking-tight">{m.first_name} {m.last_name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {subPis.length > 0 && (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sub</span>
                                                        <div className="flex flex-wrap gap-1.5 justify-end text-[10px] font-medium text-slate-500">
                                                            {subPis.map((m: any) => (
                                                                <span key={m.id} className="bg-white border border-slate-100 px-2 py-0.5 rounded-md">{m.first_name} {m.last_name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {pis.length === 0 && subPis.length === 0 && (
                                                    <div className="flex items-center gap-2 text-slate-300 text-[10px] italic">
                                                        <User className="h-3 w-3 opacity-50" /> Unassigned
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* RIGHT: STATS COLUMN - COMPACT */}
                                    <div className="w-full lg:w-[320px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col justify-center relative gap-3">
                                        <div className={`grid grid-cols-2 gap-3 transition-all duration-700 ${!isOrgVerified ? 'blur-[6px] opacity-40 select-none grayscale' : ''}`}>
                                            <div className="bg-white py-3 px-4 rounded-xl border border-slate-200/60 shadow-sm text-center">
                                                <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">New Leads</div>
                                                <div className="text-2xl font-black text-slate-900 tracking-tighter">{trial.stats?.new || 0}</div>
                                            </div>
                                            <div className="bg-white py-3 px-4 rounded-xl border border-slate-200/60 shadow-sm text-center">
                                                <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Screening</div>
                                                <div className="text-2xl font-black text-slate-900 tracking-tighter">{trial.stats?.screening || 0}</div>
                                            </div>
                                            <div className="bg-white py-3 px-4 rounded-xl border border-slate-200/60 shadow-sm text-center">
                                                <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Scheduled</div>
                                                <div className="text-2xl font-black text-slate-900 tracking-tighter">{trial.stats?.scheduled || 0}</div>
                                            </div>
                                            <div className="bg-white py-3 px-4 rounded-xl border border-slate-200/60 shadow-sm text-center ring-2 ring-emerald-50 border-emerald-100">
                                                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Enrolled</div>
                                                <div className="text-2xl font-black text-emerald-600 tracking-tighter">{trial.stats?.enrolled || 0}</div>
                                            </div>
                                        </div>
                                        {!isOrgVerified && (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 text-slate-300">
                                                <Lock className="h-6 w-6" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[150px]">
                                                Metrics Locked Pending Verification
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        
        {isPending && (
          <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-500">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-lg border border-slate-100">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Account Under Review</h3>
                <p className="text-slate-500 mb-8 font-medium">Our clinical ops team is verifying your credentials.</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 transition-colors">Check Status</button>
            </div>
          </div>
        )}

        <SupportModal 
            isOpen={isSupportOpen} 
            onClose={() => setIsSupportOpen(false)} 
            userEmail={userMemberData?.email} 
            userId={userMemberData?.user_id} 
        />
    </div>
  );
}

export default function ResearcherOverview() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    }>
      <ResearcherDashboardContent />
    </Suspense>
  );
}