"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Users, 
  CreditCard, 
  Crown, 
  BookOpen, // For Protocol Library
  FolderOpen, // For Resources
  UserCircle,
  ShieldCheck, // For Admin Section
  Lock 
} from 'lucide-react';
import Link from 'next/link';

// --- SIDEBAR CONTENT ---
function LayoutContent({ children, profile, organization, userRole, tier, loading, handleLogout }: any) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // OAM Check: Strict check for the "Owner" flag
  const isOAM = profile?.is_oam === true;

  // --- GATEKEEPING CONFIG ---
  const gateConfig = useMemo(() => {
    const currentTab = searchParams.get('tab');
    
    // Example: Locking advanced analytics in the future
    if (pathname.includes('/study/') && currentTab === 'analytics') {
      return { 
        title: "Unlock Clinical Intelligence", 
        description: "Access deep insights into recruitment performance and site-wide metrics.", 
        isRestricted: true 
      };
    }

    return { title: "", description: "", isRestricted: false };
  }, [pathname, searchParams]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-50">
        
        {/* LOGO AREA */}
        <div className="p-6 h-20 flex items-center border-b border-slate-100 font-black text-xl tracking-tight">
          Derm<span className="text-indigo-600">Trials</span>
        </div>

        <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: CLINICAL OPERATIONS */}
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Ops</p>
            
            <Link 
              href="/dashboard/researcher" 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname === '/dashboard/researcher' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Link>

            <Link 
              href="/dashboard/researcher/library" 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname.includes('/library') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <BookOpen className="h-4 w-4" /> Protocol Library
            </Link>

            <Link 
              href="/dashboard/researcher/team" 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname.includes('/team') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Users className="h-4 w-4" /> Research Team
            </Link>

            <Link 
              href="/dashboard/researcher/resources" 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname.includes('/resources') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <FolderOpen className="h-4 w-4" /> Study Resources
            </Link>
          </div>

          {/* SECTION 2: ORGANIZATION (OAM ONLY) */}
          {isOAM && (
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Organization</p>
              
              <Link 
                href="/dashboard/researcher/organization-settings" 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname.includes('/organization-settings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <ShieldCheck className="h-4 w-4" /> Organization Settings
              </Link>
            </div>
          )}

          {/* SECTION 3: PERSONAL */}
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account</p>
            
            <Link 
              href="/dashboard/researcher/profile" 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${pathname.includes('/profile') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <UserCircle className="h-4 w-4" /> My Profile
            </Link>
          </div>

        </nav>

        {/* PLAN STATUS WIDGET */}
        <div className="px-4 mb-4">
            <div className={`p-4 rounded-2xl border ${tier === 'pro' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">Current Plan</span>
                    {tier === 'pro' && <Crown className="h-3 w-3 text-amber-400 fill-amber-400" />}
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <div className={`text-sm font-black ${tier === 'pro' ? 'text-white' : 'text-slate-900'}`}>
                        {tier === 'pro' ? 'Pro Institution' : 'Starter Site'}
                    </div>
                </div>
                {/* Only OAM can upgrade */}
                {tier === 'free' && isOAM && (
                    <Link href="/dashboard/researcher/organization-settings?tab=billing" className="block w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg text-center transition-colors uppercase tracking-widest">
                        Upgrade
                    </Link>
                )}
            </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-rose-600 font-bold text-xs w-full transition-colors uppercase tracking-widest">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto relative bg-slate-50">
        
        {/* GATEKEEPER OVERLAY (For Pro Features) */}
        {tier === 'free' && gateConfig.isRestricted && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-md transition-all duration-500" />
                <div className="relative bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center max-w-sm animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">{gateConfig.title}</h3>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                        {gateConfig.description}
                    </p>
                    {isOAM ? (
                        <Link 
                            href="/dashboard/researcher/organization-settings?tab=billing"
                            className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            View Upgrade Options
                        </Link>
                    ) : (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 p-3 rounded-xl border border-amber-100">
                            Contact your Account Manager to upgrade
                        </p>
                    )}
                </div>
            </div>
        )}

        <div className="h-full">
            {children}
        </div>
      </main>
    </div>
  );
}

// --- MAIN WRAPPER (DATA FETCHING) ---
export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); 
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>(""); 
  const [tier, setTier] = useState<'free' | 'pro'>('free'); 
  const [loading, setLoading] = useState(true);

  const fetchContext = useCallback(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
          router.push('/'); 
          return; 
        }

        // 1. SEQUENTIAL FETCH: Get Profile & Team Status
        let [profileRes, teamRes] = await Promise.all([
            supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('team_members').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        // Merge logic: Team record is the source of truth for Role/OAM status
        let activeProfile = teamRes.data ? { ...teamRes.data, ...profileRes.data } : profileRes.data;

        // RETRY LOGIC (For fresh signups where DB might lag slightly)
        if (!activeProfile) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const [retryProfile, retryTeam] = await Promise.all([
                supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
                supabase.from('team_members').select('*').eq('user_id', user.id).maybeSingle()
            ]);
            activeProfile = retryTeam.data ? { ...retryTeam.data, ...retryProfile.data } : retryProfile.data;
        }

        if (activeProfile) {
            // 2. Fetch Organization Details
            if (activeProfile.organization_id) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', activeProfile.organization_id)
                    .maybeSingle();
                
                activeProfile.organizations = orgData;
            }

            setProfile(activeProfile);
            setOrganization(activeProfile.organizations || null);
            
            // --- VERIFICATION GATEKEEPING ---
            // If Org exists but is NOT verified -> Force to Pending Page
            if (activeProfile.organizations && activeProfile.organizations.is_verified === false) {
                if (pathname !== '/dashboard/researcher/pending') {
                    router.push('/dashboard/researcher/pending');
                }
            }
            // If Org IS verified but user is stuck on Pending Page -> Release to Dashboard
            else if (activeProfile.organizations && activeProfile.organizations.is_verified === true) {
                if (pathname === '/dashboard/researcher/pending') {
                    router.push('/dashboard/researcher');
                }
            }

            // Role & Tier Setup
            setUserRole(activeProfile.role || 'Member');
            const rawTier = activeProfile.organizations?.billing_tier?.toString() || 'free';
            setTier(rawTier.toLowerCase().includes('pro') ? 'pro' : 'free');
            
            setLoading(false);
            return;
        }

        router.push('/');
    } catch (err) {
        console.error("Layout Context Error:", err);
        router.push('/');
    }
  }, [router, pathname]); 

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/'); 
  };

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
        <LayoutContent 
            profile={profile} 
            organization={organization}
            userRole={userRole} 
            tier={tier} 
            loading={loading} 
            handleLogout={handleLogout}
        >
            {children}
        </LayoutContent>
    </Suspense>
  );
}