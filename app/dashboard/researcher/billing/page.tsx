"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, CreditCard, Download, CheckCircle2, 
  Crown, Zap, Lock
} from 'lucide-react';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    async function fetchBilling() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile & Tier
      const { data: profileData } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setProfile(profileData);
      
      // 2. Fetch Unlocks (Pay-Per-Lead)
      if (profileData) {
        const { data: unlocks } = await supabase
            .from('lead_unlocks')
            .select('*, leads(name, trial_id)')
            .eq('researcher_id', profileData.id)
            .order('unlocked_at', { ascending: false });

        if (unlocks) {
            setInvoices(unlocks);
            setTotalDue(unlocks.length * 50); // $50 per lead
        }
      }
      setLoading(false);
    }
    fetchBilling();
  }, []);

  // --- MOCK UPGRADE HANDLER ---
  const handleUpgrade = () => {
    alert("This will open your Stripe Checkout page. For this demo, please contact the admin to upgrade your account manually.");
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  const isPro = profile?.tier === 'pro';

  // --- NOTE: Sidebar <aside> and <main> wrapper removed. 
  // This content is automatically injected into the new layout.tsx ---
  
  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
        <header className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
            <p className="text-slate-500 mt-2">Manage your plan and invoices.</p>
        </header>

        {/* --- SUBSCRIPTION STATUS CARD --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            
            {/* CURRENT PLAN */}
            <div className={`rounded-2xl p-8 border relative overflow-hidden ${isPro ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-900'}`}>
                {isPro && (
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                )}
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Current Plan</div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {isPro ? 'Professional' : 'Free Starter'}
                                {isPro && <Crown className="h-5 w-5 text-amber-400" />}
                            </h2>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                            {isPro ? 'Active' : 'Basic'}
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm opacity-80"><CheckCircle2 className="h-4 w-4" /> Unlimited Trial Listings</div>
                        <div className="flex items-center gap-3 text-sm opacity-80"><CheckCircle2 className="h-4 w-4" /> Pay-Per-Lead Access</div>
                        {isPro ? (
                            <>
                                <div className="flex items-center gap-3 text-sm font-bold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Priority Search Ranking</div>
                                <div className="flex items-center gap-3 text-sm font-bold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Custom Branding & Video</div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 text-sm opacity-40"><Lock className="h-4 w-4" /> Priority Search Ranking</div>
                                <div className="flex items-center gap-3 text-sm opacity-40"><Lock className="h-4 w-4" /> Custom Branding & Video</div>
                            </>
                        )}
                    </div>

                    {!isPro ? (
                        <button onClick={handleUpgrade} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                            <Zap className="h-4 w-4" /> Upgrade to Pro ($199/mo)
                        </button>
                    ) : (
                        <button className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-bold border border-slate-700 hover:bg-slate-700 transition-all">
                            Manage Subscription
                        </button>
                    )}
                </div>
            </div>

            {/* BALANCE CARD */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Unpaid Balance</div>
                    <div className="text-4xl font-bold text-slate-900 mb-2">${totalDue}.00</div>
                    <p className="text-sm text-slate-500">Unbilled lead unlocks for this period.</p>
                </div>
                
                <div className="pt-8 border-t border-slate-100 mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-100 rounded text-slate-500"><CreditCard className="h-5 w-5" /></div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">Invoice (Net 30)</div>
                            <div className="text-xs text-slate-500">**** 4242</div>
                        </div>
                    </div>
                    <button className="text-sm font-bold text-indigo-600 hover:underline">Update Payment Method</button>
                </div>
            </div>
        </div>

        {/* --- INVOICE HISTORY --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Transaction History</h3>
                <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"><Download className="h-3 w-3" /> Export CSV</button>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Ref ID</th><th className="px-6 py-4 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-slate-500">{new Date(inv.unlocked_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">Lead Contact Unlock: {inv.leads?.name || "Candidate"}</td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{inv.leads?.trial_id}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">$50.00</td>
                        </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No billable activity yet.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
}