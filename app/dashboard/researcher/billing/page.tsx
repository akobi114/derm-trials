"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, CreditCard, Download, CheckCircle2, 
  Crown, Zap, Lock, Wallet, Plus, History, AlertCircle,
  ArrowUpRight, ShieldCheck, Star, Building2, Globe
} from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function fetchBilling() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const badgeRole = user.app_metadata?.role;
      setIsSuperAdmin(badgeRole === 'super_admin');

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      const org = teamMember?.organizations;
      
      if (teamMember || badgeRole === 'super_admin') {
        setProfile(teamMember);
        setOrganization(org);
        
        if (org) {
          const { data: unlocks } = await supabase
              .from('lead_unlocks')
              .select('*, leads(name, trial_id)')
              .eq('organization_id', org.id)
              .order('unlocked_at', { ascending: false });
          if (unlocks) setInvoices(unlocks);
        }
      }
      setLoading(false);
    }
    fetchBilling();
  }, []);

  const isOAM = profile?.is_oam || isSuperAdmin;
  const isPro = organization?.billing_tier === 'pro';

  const handleRefill = (amount: number) => {
    if (!isOAM) return alert("Only the Site Manager can authorize usage refills.");
    alert(`Redirecting to Stripe for ${amount} Credits...`);
  };

  const handleSubscription = () => {
    if (!isOAM) return alert("Only the Site Manager can manage platform subscriptions.");
    alert("Opening Stripe Customer Portal for Site Subscription...");
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-12">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-900 text-white rounded-lg"><CreditCard className="h-5 w-5" /></div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Site Economics</h1>
                </div>
                <p className="text-slate-500 font-medium">Institutional billing for <span className="text-indigo-600 font-bold">{organization?.name || 'your site'}</span>.</p>
            </div>
            {!isOAM && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] font-black uppercase tracking-widest">
                    <AlertCircle className="h-3.5 w-3.5" /> Billing Read-Only
                </div>
            )}
        </header>

        {/* --- ROW 1: PLATFORM TIER & WALLET --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            
            {/* PLATFORM SUBSCRIPTION CARD */}
            <div className={`rounded-[2.5rem] p-10 border-2 relative overflow-hidden transition-all ${isPro ? 'bg-slate-900 text-white border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                {isPro && <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>}
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isPro ? 'text-indigo-400' : 'text-slate-400'}`}>Current Tier</div>
                            <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                                {isPro ? 'Professional Site' : 'Free Starter'}
                                {isPro ? <Crown className="h-6 w-6 text-amber-400" /> : <Star className="h-6 w-6 text-slate-200" />}
                            </h2>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isPro ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-slate-100 text-slate-500'}`}>
                            {isPro ? 'Institutional Access' : 'Limited Access'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-10">
                        <div className="flex items-center gap-3 text-xs font-bold opacity-90"><CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-slate-300'}`} /> Unlimited NCT Postings</div>
                        <div className="flex items-center gap-3 text-xs font-bold opacity-90"><CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-slate-300'}`} /> Multi-User Team Roster</div>
                        <div className={`flex items-center gap-3 text-xs font-bold ${isPro ? 'opacity-90' : 'opacity-30'}`}><Building2 className="h-4 w-4" /> Custom Site Branding</div>
                        <div className={`flex items-center gap-3 text-xs font-bold ${isPro ? 'opacity-90' : 'opacity-30'}`}><Globe className="h-4 w-4" /> Clinic Portfolio Page</div>
                    </div>

                    <button 
                        onClick={handleSubscription}
                        disabled={!isOAM}
                        className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${
                            isPro ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                        }`}
                    >
                        {isPro ? <>Manage Plan <ArrowUpRight className="h-4 w-4" /></> : <>Upgrade Institution <Zap className="h-4 w-4" /></>}
                    </button>
                </div>
            </div>

            {/* SHARED WALLET CARD */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
                
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                        <Wallet className="h-3 w-3" /> Consumption Credit Balance
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-7xl font-black text-slate-900 tracking-tighter">{organization?.credit_balance || 0}</span>
                        <span className="text-slate-400 font-black uppercase text-sm tracking-widest">Discovery Credits</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 leading-relaxed">
                        Credits are applied site-wide to automatically unblur patient identity data.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button 
                        onClick={() => handleRefill(50)}
                        disabled={!isOAM}
                        className="py-4 border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 shadow-sm"
                    >
                        +50 Leads ($2.5k)
                    </button>
                    <button 
                        onClick={() => handleRefill(100)}
                        disabled={!isOAM}
                        className="py-4 bg-slate-900 text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 shadow-xl"
                    >
                        +100 Leads ($4k)
                    </button>
                </div>
            </div>
        </div>

        {/* --- TRANSACTION LEDGER --- */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400"><History className="h-4 w-4" /></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Institutional Ledger</h3>
                </div>
                <button className="text-[10px] font-black text-indigo-600 flex items-center gap-1.5 hover:underline uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95">
                  <Download className="h-3.5 w-3.5" /> Protocol Audit Export
                </button>
            </div>
            
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6">Timestamp</th>
                      <th className="px-8 py-6">Activity</th>
                      <th className="px-8 py-6">Reference</th>
                      <th className="px-8 py-6 text-right">Adjustment</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                    {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6 text-slate-400 text-xs font-bold">
                                {new Date(inv.unlocked_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse group-hover:scale-150 transition-transform"></div>
                                    <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                                      Auto-Unlock: {inv.leads?.name || "Anonymous Candidate"}
                                    </span>
                                </div>
                            </td>
                            <td className="px-8 py-6 font-mono text-[9px] text-slate-400 uppercase tracking-tighter">
                                {inv.leads?.trial_id || "Protocol Item"}
                            </td>
                            <td className="px-8 py-6 text-right">
                                <span className="text-xs font-black text-rose-600">-1 Credit</span>
                            </td>
                        </tr>
                    ))}
                    
                    {/* STARTING BALANCE RECORD */}
                    <tr className="bg-emerald-50/30">
                        <td className="px-8 py-6 text-slate-400 text-xs font-bold">Registration</td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                <span className="text-xs font-bold text-slate-900 uppercase">Institutional Welcome Credits</span>
                            </div>
                        </td>
                        <td className="px-8 py-6"><span className="text-[9px] font-black text-emerald-600 bg-white border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">Genesis Grant</span></td>
                        <td className="px-8 py-6 text-right font-black text-emerald-600">+100 Credits</td>
                    </tr>
                </tbody>
            </table>
            {invoices.length === 0 && (
                <div className="p-20 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest">
                    No consumption history recorded.
                </div>
            )}
        </div>
    </div>
  );
}