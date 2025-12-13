"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Beaker, ShieldCheck, ArrowRight, AlertCircle, 
  Building2, UserCircle, Hash, Mail, Lock, CheckCircle2 
} from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isResearcher = searchParams.get('role') === 'researcher';

  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    companyName: '',
    npiNumber: '', 
    role: ''       
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validation Checks
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // 2. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: isResearcher ? 'researcher' : 'patient',
            first_name: form.firstName,
            last_name: form.lastName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      // 3. Create Researcher Profile
      if (isResearcher) {
        const { error: profileError } = await supabase
          .from('researcher_profiles')
          .insert({
            user_id: authData.user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            full_name: `${form.firstName} ${form.lastName}`, // Keep as backup
            company_name: form.companyName,
            npi_number: form.npiNumber, 
            role: form.role,            
            is_verified: false,         
            subscription_tier: 'free'
          });

        if (profileError) throw profileError;
        router.push('/dashboard/researcher');
      } else {
        router.push('/');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      
      {/* LEFT: BRANDING SIDEBAR */}
      <div className={`hidden lg:flex w-[45%] p-12 flex-col justify-between relative overflow-hidden ${isResearcher ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
        {/* Abstract Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
              <Beaker className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">DermTrials</span>
          </Link>
          
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            {isResearcher ? "Accelerate your clinical research." : "Advanced skin care starts here."}
          </h1>
          <p className="text-lg opacity-80 leading-relaxed max-w-md">
            {isResearcher 
              ? "Join the premier network of verified dermatology sites. Access high-intent patients and streamline enrollment." 
              : "Access paid clinical trials and cutting-edge treatments before they hit the market."}
          </p>
        </div>

        {/* Trust Indicator */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div className={`p-2 rounded-lg ${isResearcher ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Secure & Compliant</div>
              <div className="text-xs opacity-70">HIPAA Ready • 256-bit Encryption</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: FORM SIDE */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8">
          
          {/* Header Mobile Only */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Beaker className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl text-slate-900">DermTrials</span>
            </Link>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isResearcher ? "Create Researcher Account" : "Create Patient Account"}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Already have an account? <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">Sign in</Link>
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            
            {/* NAME ROW (Split) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">First Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Jane" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  value={form.firstName}
                  onChange={e => setForm({...form, firstName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Last Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Doe" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  value={form.lastName}
                  onChange={e => setForm({...form, lastName: e.target.value})}
                />
              </div>
            </div>

            {/* RESEARCHER SPECIFIC BLOCK */}
            {isResearcher && (
              <div className="pt-2 pb-2 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Organization</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Phoenix Dermatology Center" 
                      className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                      value={form.companyName}
                      onChange={e => setForm({...form, companyName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Role / Title</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        required 
                        placeholder="Coordinator" 
                        className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                        value={form.role}
                        onChange={e => setForm({...form, role: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NPI Number</label>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="10-digit ID" 
                        className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                        value={form.npiNumber}
                        onChange={e => setForm({...form, npiNumber: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  required 
                  placeholder="name@company.com" 
                  className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>
            </div>

            {/* PASSWORD ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    className={`w-full pl-10 p-3 bg-white border rounded-lg focus:ring-2 outline-none transition-all text-slate-900 ${
                      form.confirmPassword && form.password !== form.confirmPassword 
                      ? 'border-red-300 focus:ring-red-200' 
                      : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                    value={form.confirmPassword}
                    onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  />
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-emerald-500 animate-in fade-in zoom-in" />
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              } ${isResearcher ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Create Account <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 leading-relaxed max-w-sm mx-auto">
            By joining, you agree to our Terms of Service and Privacy Policy.
            {isResearcher && <span className="block mt-2 text-amber-600 font-medium">⚠️ Manual verification required for all research sites.</span>}
          </p>
        </div>
      </div>

    </div>
  );
}