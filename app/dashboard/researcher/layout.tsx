"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Users, 
  CreditCard, 
  Crown, 
  Sparkles, 
  FileText 
} from 'lucide-react';
import Link from 'next/link';

export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>(""); 
  const [tier, setTier] = useState<'free' | 'pro'>('free'); 
  const [loading, setLoading] = useState(true);

  const fetchContext = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const [profileResponse, memberResponse] = await Promise.all([
      supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('team_members').select(`*, researcher_profiles(*)`).eq('user_id', user.id).maybeSingle()
    ]);

    const activeProfile = profileResponse.data || memberResponse.data?.researcher_profiles;
    
    if (!activeProfile) { 
        router.push('/'); 
        return; 
    }

    setProfile(activeProfile);
    setIsOwner(!!profileResponse.data);
    // If they are the owner (profileResponse has data), role is 'owner'. 
    // If they are a member, use the role from the memberResponse.
    setUserRole(profileResponse.data ? "owner" : (memberResponse.data?.role || "coordinator"));
    setTier(activeProfile.tier === 'pro' ? 'pro' : 'free');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/'); 
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-50">
        <div className="p-6 h-20 flex items-center border-b border-slate-100 font-bold text-xl tracking-tight">
          Derm<span className="text-indigo-600">Trials</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link 
            href="/dashboard/researcher" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${pathname === '/dashboard/researcher' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="h-5 w-5" /> Overview
          </Link>

          {(isOwner || userRole === 'admin') && (
            <Link 
              href="/dashboard/researcher/team" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${pathname.includes('/team') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Users className="h-5 w-5" /> Team Management
            </Link>
          )}

          <Link 
            href="/dashboard/researcher/documents" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${pathname.includes('/documents') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText className="h-5 w-5" /> Documents
            {tier !== 'pro' && <span className="ml-auto text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Pro</span>}
          </Link>

          {isOwner && (
            <>
              <Link href="/dashboard/researcher/billing" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${pathname.includes('/billing') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <CreditCard className="h-5 w-5" /> Billing
              </Link>
              <Link href="/dashboard/researcher/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${pathname.includes('/settings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Settings className="h-5 w-5" /> Settings
              </Link>
            </>
          )}
        </nav>

        {isOwner && (
            <div className="px-4 mb-4">
                <div className={`p-4 rounded-xl border ${tier === 'pro' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase opacity-60">Current Plan</span>
                        {tier === 'pro' && <Crown className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`text-lg font-extrabold ${tier === 'pro' ? 'text-white' : 'text-slate-900'}`}>
                            {tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                        </div>
                    </div>
                    {tier === 'free' && (
                        <Link href="/dashboard/researcher/billing" className="block w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg text-center transition-colors">
                            Upgrade Now
                        </Link>
                    )}
                </div>
            </div>
        )}
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 font-medium text-sm w-full transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-auto relative bg-slate-50 p-8">
        {children}
      </main>
    </div>
  );
}