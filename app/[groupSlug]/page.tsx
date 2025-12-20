"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// FIXED: Added CheckCircle2, CheckCircle, and UserCheck to the imports below
import { 
  Loader2, 
  MapPin, 
  FlaskConical, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  Globe, 
  ArrowRight,
  Info,
  CheckCircle2,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function PublicGroupPortal() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [trials, setTrials] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPortalData() {
      if (!params.groupSlug) return;

      // 1. Find the Researcher Profile by the URL Slug
      const { data: profileData, error: profileError } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('slug', params.groupSlug)
        .maybeSingle();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 2. Fetch all Approved Trials for this group
      const { data: claimsData, error: claimsError } = await supabase
        .from('claimed_trials')
        .select('*, trials(*)')
        .eq('researcher_id', profileData.id)
        .eq('status', 'approved');

      if (claimsData) {
        const formatted = claimsData.map((c: any) => ({
          ...c.trials,
          claim_id: c.id,
          custom_summary: c.custom_brief_summary || c.trials.simple_summary || c.trials.brief_summary,
          site_location: c.site_location
        }));
        setTrials(formatted);
      }

      setLoading(false);
    }

    fetchPortalData();
  }, [params.groupSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium animate-pulse">Loading Clinical Portal...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Globe className="h-10 w-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Not Found</h1>
        <p className="text-slate-500 mb-8 max-w-sm">This research group portal may have moved or the address is typed incorrectly.</p>
        <Link href="/" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
          Return to DermTrials
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 1. HIGH-END BRANDED HEADER WITH LOGO */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {profile?.logo_url ? (
                <img src={profile.logo_url} alt={profile.company_name} className="h-10 w-auto object-contain" />
             ) : (
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <div className="text-white font-black text-lg leading-none">
                        {profile?.company_name?.charAt(0) || 'D'}
                    </div>
                </div>
             )}
             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
             <h2 className="text-lg font-bold tracking-tight text-slate-900">
               {profile?.company_name}
             </h2>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Verified Site</span>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION - ETHICAL COMPLIANCE UPDATE */}
      <section className="bg-white border-b border-slate-200 py-16 md:py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
                Participate in Clinical Research.
            </h1>
            <p className="text-slate-500 text-xl leading-relaxed mb-10">
                {profile?.company_name} is inviting volunteers to join clinical research studies in <strong>{profile?.city || 'your local community'}</strong>. Help evaluate new advancements in dermatology.
            </p>
            {/* ETHICAL REVISIONS: Removing coercive "free" and "compensation" language */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-slate-500 font-bold text-sm">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> Study-related care at no cost</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> Reimbursement for time and travel</span>
            </div>
        </div>
      </section>

      {/* 3. TRIAL LIST GRID */}
      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Current Enrollment
                <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full font-bold">{trials.length}</span>
            </h2>
        </div>

        <div className="space-y-6">
            {trials.map((trial) => (
                <div 
                    key={trial.claim_id} 
                    onClick={() => router.push(`/trial/${trial.nct_id}`)}
                    className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative cursor-pointer"
                >
                    <div className="flex flex-col md:flex-row">
                        {/* Content Area */}
                        <div className="flex-1 p-8 md:p-10">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-lg border border-slate-200 tracking-wider">
                                    {trial.nct_id}
                                </span>
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5 uppercase">
                                    <FlaskConical className="h-3 w-3" /> Phase {trial.phase || 'N/A'}
                                </span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                                {trial.title}
                            </h3>

                            <div className="flex items-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-500" /> {trial.site_location?.city}, {trial.site_location?.state}</span>
                                <span className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-indigo-500" /> Enrollment Open</span>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                                <p className="text-slate-500 text-sm leading-relaxed italic line-clamp-3">
                                    "{trial.custom_summary}"
                                </p>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="w-full md:w-80 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 p-8 flex flex-col justify-center items-center">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    router.push(`/screener/${trial.nct_id}?claim_id=${trial.claim_id}`);
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-600 shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
                            >
                                Start Screener <ArrowRight className="h-5 w-5" />
                            </button>
                            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                No obligation to participate
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>


    </div>
  );
}