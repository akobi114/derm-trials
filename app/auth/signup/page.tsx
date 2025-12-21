"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ArrowRight, AlertCircle, 
  Building2, UserCircle, Hash, Mail, Lock, CheckCircle2, Phone,
  Upload, FileText, ShieldCheck // Updated icon for trust
} from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const roleParam = searchParams.get('role');
  const tokenParam = searchParams.get('token');

  const isResearcher = roleParam === 'researcher'; 
  const isTeamMember = roleParam === 'team_member'; 
  const isPatient = !isResearcher && !isTeamMember;

  const [form, setForm] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', password: '', 
    confirmPassword: '', companyName: '', npiNumber: '', 
    role: isResearcher ? 'Principal Investigator' : ''       
  });
  
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    async function verifyInvite() {
        if (tokenParam && isTeamMember) {
            setLoading(true);
            const { data, error } = await supabase
                .rpc('get_invite_details', { lookup_token: tokenParam });
            
            const invite = data && data[0];

            if (invite && invite.status === 'invited') {
                setForm(prev => ({ ...prev, email: invite.email }));
                setIsTokenValid(true);
            } else {
                setError("This invitation link is invalid or has expired.");
            }
            setLoading(false);
        }
    }
    verifyInvite();
  }, [tokenParam, isTeamMember]);

  const handleNPIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, npiNumber: numericValue });
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    const trimmed = phoneNumber.substring(0, 10);
    const areaCode = trimmed.substring(0, 3);
    const middle = trimmed.substring(3, 6);
    const last = trimmed.substring(6, 10);
    if (trimmed.length > 6) return `(${areaCode}) ${middle}-${last}`;
    else if (trimmed.length > 3) return `(${areaCode}) ${middle}`;
    else if (trimmed.length > 0) return `(${areaCode}`;
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: formatPhoneNumber(e.target.value) });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
        setError("You must agree to the Terms of Service and Privacy Policy.");
        return;
    }

    setLoading(true);
    setError(null);

    if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        setLoading(false); return;
    }
    if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false); return;
    }

    if (isResearcher && !verificationFile) {
        setError("Please upload a verification document.");
        setLoading(false); return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: isResearcher ? 'researcher' : isTeamMember ? 'team_member' : 'patient',
            first_name: form.firstName,
            last_name: form.lastName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      const userId = authData.user.id;

      if (isResearcher) {
        let verificationPath = null;
        if (verificationFile) {
            const fileExt = verificationFile.name.split('.').pop();
            const fileName = `${userId}/verification.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('verifications').upload(fileName, verificationFile);
            if (!uploadError) verificationPath = fileName;
        }

        const { error: profileError } = await supabase.from('researcher_profiles').insert({
            user_id: userId,
            first_name: form.firstName,
            last_name: form.lastName,
            full_name: `${form.firstName} ${form.lastName}`,
            company_name: form.companyName,
            npi_number: form.npiNumber, 
            role: form.role, 
            is_verified: false,         
            tier: 'free',
            email: form.email,
            phone_number: form.phone.replace(/\D/g, ''),
            verification_doc_path: verificationPath
        });
        if (profileError) throw profileError;
        router.push('/dashboard/researcher');
      } 
      
      else if (isTeamMember && isTokenValid) {
        const { error: linkError } = await supabase
            .rpc('claim_invite', { lookup_token: tokenParam });

        if (linkError) throw linkError;
        router.push('/dashboard/researcher');
      }
      
      else {
        router.push('/dashboard/patient'); 
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
      
      <div className={`hidden lg:flex w-[45%] p-12 flex-col justify-center relative overflow-hidden ${isResearcher || isTeamMember ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-8 opacity-80 hover:opacity-100 transition-opacity">
             <span className="font-bold text-2xl tracking-tight">DermTrials</span>
          </Link>
          <h1 className="text-4xl font-extrabold mb-6 leading-tight">{isResearcher ? "Accelerate your clinical research." : isTeamMember ? "Collaborate on Clinical Trials." : "Advanced skin care starts here."}</h1>
          <p className="text-lg opacity-80 leading-relaxed max-w-md">{isResearcher ? "Join the premier network of verified dermatology sites. Access high-intent patients and streamline enrollment." : isTeamMember ? "Welcome to the team. Create your account to access the study dashboard securely." : "Access paid clinical trials and cutting-edge treatments before they hit the market."}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8">
          
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="font-bold text-xl text-slate-900">DermTrials</Link>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isResearcher ? "Create Researcher Account" : isTeamMember ? "Join Your Team" : "Create Patient Account"}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">First Name</label>
                <input type="text" required placeholder="Jane" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Last Name</label>
                <input type="text" required placeholder="Doe" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
              </div>
            </div>

            {isResearcher && (
              <div className="pt-2 pb-2 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Organization</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input type="text" required placeholder="e.g. Phoenix Dermatology Center" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Role / Title</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        readOnly
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-semibold" 
                        value={form.role} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NPI Number</label>
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase">10 Digits</span>
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="tel" 
                        required={isResearcher}
                        placeholder="Numeric NPI only" 
                        className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" 
                        value={form.npiNumber} 
                        onChange={handleNPIChange} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`grid ${isResearcher ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-5`}>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                            type="email" required placeholder="name@company.com" 
                            disabled={isTeamMember && isTokenValid}
                            className={`w-full pl-10 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 ${isTeamMember && isTokenValid ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                            value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                        />
                        {isTeamMember && isTokenValid && <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />}
                    </div>
                </div>
                {isResearcher && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <input type="tel" required placeholder="(555) 123-4567" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" value={form.phone} onChange={handlePhoneChange} />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input type="password" required placeholder="8+ chars" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input type="password" required placeholder="Confirm" className={`w-full pl-10 p-3 bg-white border rounded-lg focus:ring-2 outline-none transition-all text-slate-900 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-500'}`} value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} />
                  {form.confirmPassword && form.password === form.confirmPassword && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-emerald-500 animate-in fade-in zoom-in" />}
                </div>
              </div>
            </div>

            {isResearcher && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl border-dashed">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><FileText className="h-4 w-4" /> Professional Verification</label>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Required</span>
                    </div>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`flex items-center gap-3 p-3 border rounded-lg text-sm transition-colors ${verificationFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {verificationFile ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                            {verificationFile ? <span className="font-bold">{verificationFile.name}</span> : <span>Upload ID Badge or Letterhead...</span>}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="flex items-center h-5">
                    <input
                        id="terms"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
                <div className="text-xs leading-relaxed">
                    <label htmlFor="terms" className="font-medium text-slate-700 cursor-pointer">
                        I agree to the <Link href="/terms" className="text-indigo-600 font-bold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-indigo-600 font-bold hover:underline">Privacy Policy</Link>. 
                    </label>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !agreedToTerms}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                loading || !agreedToTerms ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
              } ${isResearcher || isTeamMember ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Complete Registration <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          {isResearcher && (
            <div className="flex items-center gap-2 justify-center p-3 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 uppercase tracking-widest shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> New research accounts are typically verified within 24 hours
            </div>
          )}
        </div>
      </div>
    </div>
  );
}