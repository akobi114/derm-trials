"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, Beaker, ArrowRight, AlertCircle, Lock, Mail, Wand2 } from 'lucide-react';

// 🔒 SECURITY: Define your Admin Email here to block password attempts
const ADMIN_EMAIL = "akobic14@gmail.com"; 

export default function Login() {
  const router = useRouter();
  
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // 🛑 SECURITY BLOCK: Prevent Admin from using Password Login
    if (!useMagicLink && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
      setError("Admin accounts are restricted to Magic Link login only.");
      setLoading(false);
      return; // Stop execution immediately
    }

    try {
      if (useMagicLink) {
        // --- ADMIN / MAGIC LINK FLOW ---
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) throw error;
        setMessage('Check your email for the magic link!');
      } else {
        // --- RESEARCHER / PASSWORD FLOW ---
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (!data.user) throw new Error("No user found");

        // Role Check
        const { data: researcherProfile } = await supabase
          .from('researcher_profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (researcherProfile) {
          router.push('/dashboard/researcher');
        } else {
          router.push('/'); 
        }
        router.refresh();
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-8 text-center bg-white border-b border-slate-50">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Beaker className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {useMagicLink ? "Admin Access" : "Welcome Back"}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {useMagicLink ? "Sign in via Magic Link" : "Sign in to access your dashboard"}
          </p>
        </div>

        {/* Form */}
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

          <form onSubmit={handleLogin} className="space-y-5">
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

            {/* PASSWORD FIELD (Only show if NOT using magic link) */}
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
              disabled={loading}
              className={`w-full py-3.5 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${useMagicLink ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                useMagicLink ? <>Send Magic Link <Wand2 className="h-4 w-4" /></> : <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* TOGGLE BUTTON */}
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