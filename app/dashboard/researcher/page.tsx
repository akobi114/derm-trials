"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { 
  Loader2, MapPin, Edit3, ChevronRight, BarChart3, AlertCircle, 
  FlaskConical, Lock, Search, CheckCircle2, Clock, Building2, Check, 
  Users, Phone, Calendar, Filter, X, ArrowUpDown, Tag, Plus, ClipboardList, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function ResearcherOverview() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- SEARCH, FILTER & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'unread' | 'nct'>('unread');

  // Sync current view with pathname
  const currentView = useMemo(() => {
    if (pathname.includes('/team')) return 'team';
    if (pathname.includes('/documents')) return 'documents';
    return 'overview';
  }, [pathname]);

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
      setTier(activeProfile.tier === 'pro' ? 'pro' : 'free');

      const { data: claims } = await supabase.from('claimed_trials').select(`*, trials (*)`).eq('researcher_id', activeProfile.id);
      
      if (claims) {
          const formatted = await Promise.all(claims.map(async (c: any) => {
                const { data: leads } = await supabase.from('leads')
                    .select('id, site_status')
                    .eq('trial_id', c.nct_id)
                    .eq('site_facility', c.site_location?.facility)
                    .eq('site_city', c.site_location?.city)
                    .eq('site_state', c.site_location?.state);

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
                    stats: { 
                        new: leads?.filter((l: any) => l.site_status === 'New').length || 0, 
                        screening: leads?.filter((l: any) => l.site_status === 'Contacted').length || 0, 
                        scheduled: leads?.filter((l: any) => l.site_status === 'Scheduled').length || 0, 
                        enrolled: leads?.filter((l: any) => l.site_status === 'Enrolled').length || 0, 
                    },
                    unread_count: unreadCount 
                };
          }));
          setMyTrials(formatted);
      }
      setLoading(false);
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const conditions = useMemo(() => {
      const all = myTrials.map(t => t.condition).filter(Boolean);
      return Array.from(new Set(all));
  }, [myTrials]);

  const toggleCondition = (cond: string) => {
      setSelectedConditions(prev => 
          prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
      );
  };

  const processedTrials = useMemo(() => {
      return myTrials
        .filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.nct_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCondition = selectedConditions.length === 0 || selectedConditions.includes(t.condition);
            return matchesSearch && matchesCondition;
        })
        .sort((a, b) => {
            if (sortBy === 'unread') return (b.unread_count || 0) - (a.unread_count || 0);
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            if (sortBy === 'nct') return a.nct_id.localeCompare(b.nct_id);
            return 0;
        });
  }, [myTrials, searchTerm, selectedConditions, sortBy]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-white"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;

  if (myTrials.length === 0 && !profile.is_submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in zoom-in-95 duration-700 px-6">
        <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-indigo-100/50">
          <ClipboardList className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Finalize Your Profile</h1>
        <p className="text-slate-500 text-lg max-w-md mb-10 leading-relaxed font-medium">
          Welcome to DermTrials. To access your clinical trial dashboard, please locate and claim your active protocols for verification.
        </p>
        <Link 
          href="/dashboard/researcher/AddStudy"
          className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-indigo-200 transform hover:-translate-y-1 active:scale-95"
        >
          <Plus className="h-5 w-5" /> Select Your Trials
        </Link>
      </div>
    );
  }

  if (profile && !profile.is_verified) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5"><ShieldCheck className="w-64 h-64" /></div>
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8"><Clock className="h-10 w-10 animate-pulse" /></div>
            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Identity Verification Pending</h1>
            <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Your application and claimed trials have been sent to our compliance team. Once verified, you will receive full access to lead management and analytics.
            </p>
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Protocols Awaiting Approval ({myTrials.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                    {myTrials.map(t => (
                        <div key={t.claim_id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0"><FlaskConical className="h-5 w-5" /></div>
                            <div className="min-w-0">
                                <div className="text-[9px] font-black text-slate-400 uppercase">{t.nct_id}</div>
                                <div className="text-sm font-bold text-slate-700 truncate">{t.title}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/dashboard/researcher/AddStudy" className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                    <Plus className="h-4 w-4" /> Add More to Application
                </Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative">
        {/* PRO UPGRADE HAZE OVERLAY */}
        {(currentView === 'team' || currentView === 'documents') && tier === 'free' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center -mx-8 -my-8">
                <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-md rounded-3xl" />
                <div className="relative bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center max-w-sm animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Pro Feature</h3>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        {currentView === 'team' ? 'Team management and multi-user access are available on the Pro plan.' : 'Document management and investigator vaults are available on the Pro plan.'}
                    </p>
                    <Link 
                        href="/dashboard/researcher/billing"
                        className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        View Upgrade Options
                    </Link>
                </div>
            </div>
        )}

        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Overview</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{profile?.company_name}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search protocols..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select 
                    className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                >
                    <option value="unread">Activity</option>
                    <option value="title">Name</option>
                    <option value="nct">NCT ID</option>
                </select>
            </div>
          </div>
        </header>

        {/* BLURRED CONTENT WRAPPER */}
        <div className={(currentView === 'team' || currentView === 'documents') && tier === 'free' ? 'blur-sm select-none pointer-events-none' : ''}>
            {conditions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5"><Tag className="h-3 w-3" /> Filter Conditions:</span>
                    {conditions.map(cond => (
                        <button key={cond} onClick={() => toggleCondition(cond)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${selectedConditions.includes(cond) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}>{cond}</button>
                    ))}
                </div>
            )}

            <div className="space-y-4">
                {processedTrials.map((trial) => (
                    <div key={trial.claim_id} className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative">
                        <div className="flex flex-col lg:flex-row">
                            <div className="flex-1 p-6 lg:pl-8 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">{trial.nct_id}</span>
                                        {trial.unread_count > 0 && (
                                            <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1.5 animate-pulse"><div className="w-1 h-1 bg-red-600 rounded-full"></div> {trial.unread_count} New</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors"><Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&claim_id=${trial.claim_id}`}>{trial.title}</Link></h3>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {/* FIXED: Now displays City and State */}
                                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-indigo-500" /> {trial.site_location?.city}, {trial.site_location?.state}</span>
                                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 rounded-md font-black">{trial.condition}</span>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-3">
                                    {isOwner && (
                                        <>
                                            {/* RESTORED: Original Icons, Hrefs now direct even for Free users */}
                                            <Link 
                                              href={`/dashboard/researcher/study/${trial.nct_id}?tab=profile&claim_id=${trial.claim_id}`} 
                                              className={`p-2.5 border rounded-xl transition-all ${tier === 'pro' ? 'text-slate-400 hover:text-indigo-600 border-slate-100' : 'text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                            >
                                              <Edit3 className="h-4 w-4" />
                                            </Link>
                                            <Link 
                                              href={`/dashboard/researcher/study/${trial.nct_id}?tab=analytics&claim_id=${trial.claim_id}`} 
                                              className={`p-2.5 border rounded-xl transition-all ${tier === 'pro' ? 'text-slate-400 hover:text-indigo-600 border-slate-100' : 'text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                            >
                                              <BarChart3 className="h-4 w-4" />
                                            </Link>
                                        </>
                                    )}
                                    <Link href={`/dashboard/researcher/study/${trial.nct_id}?tab=leads&claim_id=${trial.claim_id}`} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] hover:bg-indigo-700 shadow-lg transition-all uppercase tracking-widest">Manage Study</Link>
                                </div>
                            </div>
                            
                            <div className="w-full lg:w-[280px] bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center"><div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-center"><Users className="h-2.5 w-2.5" /> New</div><div className="text-lg font-black text-slate-900">{trial.stats?.new || 0}</div></div>
                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center"><div className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-center"><Phone className="h-2.5 w-2.5" /> Screen</div><div className="text-lg font-black text-slate-900">{trial.stats?.screening || 0}</div></div>
                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center"><div className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-center"><Calendar className="h-2.5 w-2.5" /> Sched</div><div className="text-lg font-black text-slate-900">{trial.stats?.scheduled || 0}</div></div>
                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center"><div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-center"><CheckCircle2 className="h-2.5 w-2.5" /> Enroll</div><div className="text-lg font-black text-slate-900">{trial.stats?.enrolled || 0}</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}