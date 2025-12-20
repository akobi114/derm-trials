"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ArrowRight, AlertCircle, 
  Building2, UserCircle, Hash, Mail, Lock, CheckCircle2, Phone,
  Upload, FileText
} from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const roleParam = searchParams.get('role');
  const tokenParam = searchParams.get('token');

  // --- LOGIC: DETERMINE USER TYPE ---
  const isResearcher = roleParam === 'researcher'; 
  const isTeamMember = roleParam === 'team_member'; 
  const isPatient = !isResearcher && !isTeamMember;

  const [form, setForm] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', password: '', 
    confirmPassword: '', companyName: '', npiNumber: '', role: ''       
  });
  
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // --- TOKEN VERIFICATION (Using Secure RPC) ---
  useEffect(() => {
    async function verifyInvite() {
        if (tokenParam && isTeamMember) {
            setLoading(true);
            // Call the secure SQL function we just created
            const { data, error } = await supabase
                .rpc('get_invite_details', { lookup_token: tokenParam });
            
            // RPC returns an array, get the first item
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

  // --- FORMATTING HELPER ---
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

  // --- SIGNUP HANDLER ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // 1. Create Auth User
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

      // 2. Handle Specific Roles
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
            subscription_tier: 'free',
            email: form.email,
            phone_number: form.phone.replace(/\D/g, ''),
            verification_doc_path: verificationPath
        });
        if (profileError) throw profileError;
        router.push('/dashboard/researcher');
      } 
      
      else if (isTeamMember && isTokenValid) {
        // CALL SECURE RPC TO LINK ACCOUNT
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

  // --- UI TEXT HELPERS ---
  const getSidebarTitle = () => {
      if (isResearcher) return "Accelerate your clinical research.";
      if (isTeamMember) return "Collaborate on Clinical Trials.";
      return "Advanced skin care starts here.";
  };

  const getSidebarDesc = () => {
      if (isResearcher) return "Join the premier network of verified dermatology sites. Access high-intent patients and streamline enrollment.";
      if (isTeamMember) return "Welcome to the team. Create your account to access the study dashboard securely.";
      return "Access paid clinical trials and cutting-edge treatments before they hit the market.";
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      
      {/* LEFT: BRANDING SIDEBAR */}
      <div className={`hidden lg:flex w-[45%] p-12 flex-col justify-center relative overflow-hidden ${isResearcher || isTeamMember ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-8 opacity-80 hover:opacity-100 transition-opacity">
             <span className="font-bold text-2xl tracking-tight">DermTrials</span>
          </Link>
          
          <h1 className="text-4xl font-extrabold mb-6 leading-tight">{getSidebarTitle()}</h1>
          <p className="text-lg opacity-80 leading-relaxed max-w-md">{getSidebarDesc()}</p>
        </div>
      </div>

      {/* RIGHT: FORM SIDE */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8">
          
          {/* Mobile Header */}
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
            {/* NAME ROW */}
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

            {/* RESEARCHER SPECIFIC BLOCK (Hidden for Team Members) */}
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
                      <input type="text" required placeholder="Principal Investigator" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NPI Number</label><span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Optional</span></div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input type="text" placeholder="10-digit ID" className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" value={form.npiNumber} onChange={e => setForm({...form, npiNumber: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT ROW */}
            <div className={`grid ${isResearcher ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-5`}>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                            type="email" required placeholder="name@company.com" 
                            // Lock if team member with valid token
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

            {/* PASSWORD ROW */}
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
            
            {/* Helper Text for Password */}
            <div className="text-[10px] text-slate-400 flex gap-2">
                <span className={form.password.length >= 8 ? "text-emerald-600 font-bold" : ""}>• 8+ Chars</span>
                <span className={/[A-Z]/.test(form.password) ? "text-emerald-600 font-bold" : ""}>• Uppercase</span>
                <span className={/[a-z]/.test(form.password) ? "text-emerald-600 font-bold" : ""}>• Lowercase</span>
                <span className={/[0-9]/.test(form.password) ? "text-emerald-600 font-bold" : ""}>• Number</span>
            </div>

            {/* VERIFICATION DOCUMENT UPLOAD (RESEARCHER ONLY) */}
            {isResearcher && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl border-dashed">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><FileText className="h-4 w-4" /> Professional Verification</label>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Required</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        Please upload a document to verify your <strong>professional identity</strong> (e.g. ID Badge, Business Card, or Letterhead).
                    </p>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`flex items-center gap-3 p-3 border rounded-lg text-sm transition-colors ${verificationFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {verificationFile ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                            {verificationFile ? <span className="font-bold">{verificationFile.name}</span> : <span>Click to upload file (Image or PDF)...</span>}
                        </div>
                    </div>
                </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              } ${isResearcher || isTeamMember ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Create Account <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 leading-relaxed max-w-sm mx-auto">
            By joining, you agree to our <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
            {isResearcher && <span className="block mt-2 text-amber-600 font-medium">⚠️ Manual verification required for all research sites.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}