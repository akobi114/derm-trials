"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { 
  ShieldCheck, Zap, Users, BarChart3, 
  CheckCircle2, ArrowRight, MousePointerClick,
  MapPin, Check, X
} from "lucide-react";

export default function ForResearchers() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-100">
            <Zap className="h-3 w-3" /> New: Multi-Site Management Logic
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
            Accelerate your <br />
            <span className="text-indigo-600">Patient Recruitment</span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Claim your ClinicalTrials.gov listing, manage leads in our HIPAA-compliant CRM, and unlock premium features to fill your study faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup?role=researcher" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
              Claim My Study <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50 transition-all">
              How it Works
            </Link>
          </div>
        </div>
      </section>

      {/* --- VISUAL PROOF (The Card Comparison) --- */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Stand out in the search results</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Free listings get buried. Verified Professional sites get 3x more engagement. See the difference.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
            
            {/* 1. STANDARD CARD (Free Tier) */}
            <div className="opacity-60 scale-95 grayscale transition-all hover:grayscale-0 hover:scale-100 hover:opacity-100">
              <div className="text-center mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Standard (Free)</div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm pointer-events-none select-none relative">
                <div className="h-4 w-16 bg-slate-100 rounded mb-4"></div>
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-2"></div>
                <div className="h-6 w-1/2 bg-slate-200 rounded mb-6"></div>
                <div className="flex gap-2 mb-6">
                  <div className="h-4 w-20 bg-slate-100 rounded"></div>
                  <div className="h-4 w-20 bg-slate-100 rounded"></div>
                </div>
                <div className="h-10 w-full bg-slate-50 rounded"></div>
              </div>
            </div>

            {/* 2. PREMIUM CARD (Professional Tier) */}
            <div className="relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg z-20">
                PROFESSIONAL PLAN
              </div>
              <div className="text-center mb-4 text-xs font-bold text-indigo-600 uppercase tracking-widest">Verified Profile</div>
              <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-xl relative overflow-hidden">
                {/* Badge */}
                <div className="absolute top-4 left-6 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED SITE
                </div>
                
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-2">
                    <div className="h-4 w-16 bg-emerald-100 rounded"></div>
                    <div className="h-6 w-24 bg-indigo-50 border border-indigo-100 rounded flex items-center justify-center text-[10px] font-bold text-indigo-600">YOUR LOGO</div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">A Phase 3 Study for Moderate Psoriasis</h3>
                  <div className="flex gap-3 mb-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Recruiting</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Phoenix, AZ</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-6">Join a cutting-edge study managed by [Your Company Name]. Includes video introduction and detailed FAQ.</p>
                  <div className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm text-center shadow-lg shadow-indigo-200">
                    Priority Access <ArrowRight className="h-4 w-4 inline ml-1" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FEATURES & TOOLS --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Built for Site Coordinators</h2>
            <p className="text-slate-500 max-w-xl mx-auto">We provide the tools you need to manage patient flow effectively.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="space-y-4 p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Multi-Site Routing</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Does your trial have 9 locations? Our intelligent routing ensures patients are matched to the specific PI and Facility nearest their zip code.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient CRM</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Forget spreadsheets. Use our built-in CRM to track status (Contacted, Screened, Enrolled) and keep internal notes on every candidate.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">AI Pre-Screening</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our AI reads your protocol and generates patient-friendly screeners automatically. We qualify leads before they ever reach your inbox.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* --- PRICING TIERS --- */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-500">Start for free, upgrade when you need volume.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* FREE PLAN */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Free Starter</h3>
                <p className="text-sm text-slate-500 mt-2">Perfect for claiming your profile.</p>
                <div className="mt-4 text-4xl font-extrabold text-slate-900">$0 <span className="text-sm font-medium text-slate-400">/mo</span></div>
              </div>
              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> Claim Unlimited Trials</div>
                <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> View Lead Counts</div>
                <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> Basic CRM Access</div>
                <div className="flex items-center gap-3 text-sm text-slate-400"><X className="h-4 w-4" /> Custom Branding</div>
                <div className="flex items-center gap-3 text-sm text-slate-400"><X className="h-4 w-4" /> Priority Search Ranking</div>
              </div>
              <Link href="/auth/signup?role=researcher" className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-center">
                Get Started Free
              </Link>
            </div>

            {/* PRO PLAN */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
              <div className="mb-6 relative z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Professional</h3>
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">POPULAR</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">For sites actively recruiting.</p>
                <div className="mt-4 text-4xl font-extrabold text-white">$199 <span className="text-sm font-medium text-slate-500">/mo</span></div>
              </div>
              <div className="space-y-4 mb-8 flex-1 relative z-10">
                <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-indigo-400" /> <strong>Priority Search Ranking</strong></div>
                <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-indigo-400" /> Custom Logo & Photos</div>
                <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-indigo-400" /> Intro Video Hosting</div>
                <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-indigo-400" /> Full Patient CRM Features</div>
                <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-indigo-400" /> Discounted Lead Unlocks</div>
              </div>
              <Link href="/auth/signup?role=researcher" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-center relative z-10 shadow-lg shadow-indigo-900/50">
                Start 14-Day Free Trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">Ready to find your next patient?</h2>
          <p className="text-slate-500 mb-10 text-lg">
            It takes 2 minutes to verify your identity and claim your first study.
          </p>
          <Link href="/auth/signup?role=researcher" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1">
            Claim Profile Now <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}