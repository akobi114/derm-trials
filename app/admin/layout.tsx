"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { 
  Mail, Activity, Building2, 
  Database, ShieldCheck, HelpCircle, Lock, 
  ChevronRight, Sparkles, LogOut, CheckCircle
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'lead_feed';
  
  // New State for the Red Badge
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Fetch count of unverified organizations for the badge
    const fetchCount = async () => {
      const { count } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);
      
      setPendingCount(count || 0);
    };

    fetchCount();
    
    // Optional: Subscribe to changes so the badge updates in real-time
    const channel = supabase
      .channel('org_count_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { group: "Network Monitor", items: [
      { id: 'lead_feed', label: 'Lead Feed', icon: Mail, path: '/admin' },
      { id: 'site_opportunities', label: 'Site Opportunities', icon: Activity, path: '/admin' },
      { id: 'active_sites', label: 'Active Sites', icon: Building2, path: '/admin' },
    ]},
    { group: "System Operations", items: [
      { id: 'trials', label: 'Trial Management', icon: Database, path: '/admin/system' },
      
      // MODIFIED: Added Badge Logic Here
      { 
        id: 'researchers', 
        label: 'Institutional Approvals', 
        icon: ShieldCheck, 
        path: '/admin/system',
        badge: pendingCount > 0 ? pendingCount : null 
      },
      
      // NEW: Restored Active Accounts Tab
      { 
        id: 'verified', 
        label: 'Active Institutions', 
        icon: CheckCircle, 
        path: '/admin/system' 
      },
      
      { id: 'support', label: 'Support Inbox', icon: HelpCircle, path: '/admin/system' },
      { id: 'security', label: 'Security & MFA', icon: Lock, path: '/admin/system' },
    ]}
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Command Center</h2>
          </div>
          <nav className="flex-1 p-4 space-y-8">
            {menuItems.map((group) => (
              <div key={group.group}>
                <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{group.group}</h3>
                <div className="space-y-1">
                  {group.items.map((item: any) => {
                    const isActive = activeTab === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={`${item.path}?tab=${item.id}`}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                          isActive 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {item.label}
                        </div>
                        
                        {/* BADGE RENDERING */}
                        {item.badge ? (
                           <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                             {item.badge}
                           </span>
                        ) : (
                           isActive && <ChevronRight className="h-3 w-3" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
            <div className="p-4 bg-indigo-900 rounded-2xl text-white relative overflow-hidden">
              <Sparkles className="absolute -right-2 -top-2 h-12 w-12 opacity-10 rotate-12" />
              <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Status</p>
              <p className="text-xs font-bold italic leading-tight">All systems operational.</p>
            </div>
            
            <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            >
                <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}