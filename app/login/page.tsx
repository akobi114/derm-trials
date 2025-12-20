"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, Beaker, ArrowRight, AlertCircle, Lock, Mail, Wand2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  
  // Login State
  const [view, setView] = useState<'login' | 'mfa'>('login');
  const [useMagicLink, setUseMagicLink] = useState(true); // Default to Magic Link
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true); // Start true to check session first
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // MFA State
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');

  // 1. ON LOAD: CHECK IF USER IS ALREADY LOGGED IN
  useEffect(() => {
    async function initSessionCheck() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in. Check MFA & Role.
        await checkMfaAndRedirect();
      } else {
        setLoading(false); // No session, show login form
      }
    }
    initSessionCheck();
  }, []);

  // 2. CHECK MFA STATUS & REDIRECT
  const checkMfaAndRedirect = async () => {
    // A. Check MFA Level
    const { data: mfaData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // B. If user needs MFA (AAL2) but is currently only on Email (AAL1)
    if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp[0]; // Get their TOTP factor
      
      if (totpFactor) {
        setFactorId(totpFactor.id);
        setView('mfa'); // <--- SHOW THE ENTER CODE SCREEN
        setLoading(false);
        return; 
      }
    }

    // C. If MFA is satisfied, check Role & Redirect
    await finalizeRedirect();
  };

  // 3. HANDLE LOGIN FORM SUBMIT
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (useMagicLink) {
        // --- MAGIC LINK FLOW ---
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        setMessage('Check your email for the magic link!');
        setLoading(false);
      } else {
        // --- PASSWORD FLOW ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Password login succeeds -> Check if MFA needed immediately
        await checkMfaAndRedirect();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in");
      setLoading(false);
    }
  };

  // 4. VERIFY MFA CODE
  const handleMfaVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factorId,
          code: mfaCode
      });

      if (error) {
          setError("Invalid code. Please try again.");
          setLoading(false);
      } else {
          // Success! Escalated to AAL2. Now redirect.
          await finalizeRedirect();
      }
  };

  // 5. FINAL REDIRECT LOGIC (UPDATED FOR COORDINATORS)
  const finalizeRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check Admin Table
      // Use maybeSingle() to avoid errors if not found
      const { data: admin } = await supabase.from('admins').select('role').eq('user_id', user.id).maybeSingle();
      if (admin) {
          router.push('/admin/system');
          router.refresh();
          return;
      } 
      
      // 2. Check Researcher Profile (PI)
      const { data: researcher } = await supabase.from('researcher_profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (researcher) {
          router.push('/dashboard/researcher');
          router.refresh();
          return;
      }

      // 3. NEW: Check Team Member (Coordinator)
      // This was likely missing before!
      const { data: member } = await supabase.from('team_members').select('id').eq('user_id', user.id).maybeSingle();
      if (member) {
          router.push('/dashboard/researcher');
          router.refresh();
          return;
      }

      // 4. Default / Candidate Dashboard
      router.push('/dashboard/candidate'); 
      router.refresh();
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-8 text-center bg-white border-b border-slate-50">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              {view === 'mfa' ? <ShieldCheck className="h-6 w-6" /> : <Beaker className="h-6 w-6" />}
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {view === 'mfa' ? "Two-Factor Auth" : (useMagicLink ? "Magic Link Access" : "Welcome Back")}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {view === 'mfa' ? "Enter the code from your authenticator app" : (useMagicLink ? "Sign in via email link" : "Sign in to your account")}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl flex items-start gap-3 animate-in fade-in">
              <Wand2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="font-bold">{message}</span>
            </div>
          )}

          {loading && !message && view !== 'mfa' && (
             <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
          )}

          {/* --- VIEW 1: STANDARD LOGIN --- */}
          {view === 'login' && !loading && (
              <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input 
                      type="email" 
                      required 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-slate-900"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!useMagicLink && (
                  <div className="animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
                      <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="password" 
                        required={!useMagicLink}
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className={`w-full py-3.5 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${useMagicLink ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                >
                  {useMagicLink ? <>Send Magic Link <Wand2 className="h-4 w-4" /></> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
          )}

          {/* --- VIEW 2: MFA CHALLENGE --- */}
          {view === 'mfa' && (
              <form onSubmit={handleMfaVerify} className="space-y-6 animate-in slide-in-from-right-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Authentication Code</label>
                      <input 
                          type="text" 
                          placeholder="123456" 
                          className="w-full text-center text-3xl font-mono tracking-[0.5em] p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                          autoFocus
                      />
                  </div>
                  <button 
                      type="submit" 
                      disabled={loading || mfaCode.length < 6}
                      className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Login"}
                  </button>
                  <button onClick={() => { setView('login'); setLoading(false); }} className="w-full text-sm text-slate-400 hover:text-slate-600">Back to Login</button>
              </form>
          )}

          {/* TOGGLE BUTTON (Only visible in login view) */}
          {view === 'login' && !loading && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button 
                onClick={() => {
                  setUseMagicLink(!useMagicLink);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                {useMagicLink ? "Use Password Login" : "Or sign in with Magic Link"}
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link href="/auth/signup?role=researcher" className="text-indigo-600 font-bold hover:underline">
              Create one
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}