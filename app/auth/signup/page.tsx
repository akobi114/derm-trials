"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OrganizationSearch from '@/components/OrganizationSearch';
// Import the Stage 3 & 4 components
import InvestigatorRoster from '@/components/InvestigatorRoster'; 
import ProtocolAssignment from '@/components/ProtocolAssignment';
import { 
  Loader2, AlertCircle, 
  Mail, CheckCircle2, 
  Upload, ShieldCheck, ChevronRight,
  Building, Lock, User, Sparkles // <--- ADDED SPARKLES HERE
} from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL Context
  const roleParam = searchParams.get('role');
  const isResearcher = roleParam === 'researcher'; 
  const isTeamMember = roleParam === 'team_member'; 
  const isPatient = !isResearcher && !isTeamMember;

  // Wizard State
  const [step, setStep] = useState(1); 
  const [orgStatus, setOrgStatus] = useState<'searching' | 'claimed' | 'matched' | 'new'>('searching');
  const [claimedByEmail, setClaimedByEmail] = useState("");

  // Form State
  const [form, setForm] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', password: '', 
    confirmPassword: '', companyName: '', organizationId: null as string | null,
    roleType: '', // 'Coordinator' or 'Investigator'
  });
  
  const [finalRoster, setFinalRoster] = useState<any[]>([]);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // --- HELPER: PHONE FORMATTER ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); 
    if (input.length > 10) input = input.substring(0, 10); 

    let formatted = input;
    if (input.length > 6) {
        formatted = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6)}`;
    } else if (input.length > 3) {
        formatted = `(${input.substring(0, 3)}) ${input.substring(3)}`;
    } else if (input.length > 0) {
        formatted = `(${input}`;
    }
    
    setForm(prev => ({ ...prev, phone: formatted }));
  };

  // --- HELPER: PASSWORD STRENGTH ---
  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/\d/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*]/.test(pwd)) return "Password must contain a special character (!@#$%^&*).";
    return null;
  };

  // --- LOGIC: ORGANIZATION DISCOVERY ---
  const handleOrgSelection = async (org: { id: string | null, name: string }) => {
    setError(null);
    let targetId = org.id;
    const targetName = org.name;

    // 1. SAFETY LOOKUP: Secure RPC to prevent duplicate orgs
    if (!targetId) {
        console.log("No ID provided. Searching DB via RPC...");
        const { data: lookupResult } = await supabase
            .rpc('lookup_org_by_name', { target_name: targetName });
        
        if (lookupResult && lookupResult.id) {
            console.log("Found existing org by RPC:", lookupResult.id);
            targetId = lookupResult.id;
        }
    }

    setForm(prev => ({ ...prev, companyName: targetName, organizationId: targetId }));

    // 2. CHECK STATUS
    if (targetId) {
        const { data: statusData, error: rpcError } = await supabase
            .rpc('check_org_status', { org_id: targetId });

        if (rpcError) console.error("RPC Check Failed:", rpcError);

        if (statusData?.is_claimed || statusData?.is_verified) {
            const { data: publicProfile } = await supabase
                .from('researcher_profiles')
                .select('email')
                .eq('organization_id', targetId)
                .limit(1)
                .maybeSingle();

            const rawEmail = publicProfile?.email || "admin@institution.com";
            const [local, domain] = rawEmail.split('@');
            const maskedLocal = local.length > 2 ? `${local.substring(0, 2)}***` : `${local}***`;
            
            setClaimedByEmail(`${maskedLocal}@${domain}`);
            setOrgStatus('claimed');
            return; 
        }
        setOrgStatus('matched');
    } else {
        setOrgStatus('new');
    }
    
    setStep(2);
  };

  // --- LOGIC: STAGE 2 SIGNUP (Auth & Org Creation) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("Full Name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (isResearcher && !form.roleType) { setError("Please select your role."); return; }
    
    if (isResearcher) {
        const rawPhone = form.phone.replace(/\D/g, '');
        if (rawPhone.length !== 10) { setError("Please enter a valid 10-digit phone number."); return; }
        if (!verificationFile) { setError("Please upload verification document."); return; }
    }

    const pwdError = checkPasswordStrength(form.password);
    if (pwdError) { setError(pwdError); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!agreedToTerms) { setError("Please agree to the Terms & Privacy Policy."); return; }

    setLoading(true);

    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: isResearcher ? 'researcher' : isTeamMember ? 'team_member' : 'patient',
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Creation failed.");

      const userId = authData.user.id;

      if (isResearcher) {
        // 2. Upload Verification
        let vPath = null;
        if (verificationFile) {
            const ext = verificationFile.name.split('.').pop();
            vPath = `${userId}/v-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('verifications').upload(vPath, verificationFile);
            if (uploadError) throw new Error(`File Upload Error: ${uploadError.message}`);
        }

        // 3. Handle Organization Anchor
        let finalOrgId = form.organizationId;
        
        if (!finalOrgId) {
            const { data: lookupResult } = await supabase
                .rpc('lookup_org_by_name', { target_name: form.companyName.trim() });
            
            if (lookupResult && lookupResult.id) {
                 finalOrgId = lookupResult.id;
                 if (lookupResult.oam_id) throw new Error("This organization is already claimed. Please contact the administrator for an invite.");
                 
                 const { error: linkErr } = await supabase.from('organizations').update({ oam_id: userId }).eq('id', finalOrgId);
                 if (linkErr) throw new Error(`Org Link Error: ${linkErr.message}`);
            } else {
                 const { data: newOrg, error: orgErr } = await supabase
                    .from('organizations')
                    .insert({ 
                        name: form.companyName, 
                        is_verified: false,
                        oam_id: userId,
                        credit_balance: 100
                    })
                    .select().single();
                if (orgErr) throw new Error(`Org DB Error: ${orgErr.message}`);
                finalOrgId = newOrg.id;
            }
        } else {
            const { data: statusData } = await supabase.rpc('check_org_status', { org_id: finalOrgId });
            if (statusData?.is_claimed) throw new Error("This organization is already claimed. Access denied.");

            const { error: linkErr } = await supabase.from('organizations').update({ oam_id: userId }).eq('id', finalOrgId);
            if (linkErr) throw new Error(`Org Link Error: ${linkErr.message}`);
        }

        setForm(prev => ({ ...prev, organizationId: finalOrgId }));

        // 4. Determine System Role (DIRECT MAPPING)
        const systemRole = form.roleType === 'Investigator' ? 'Clinical Investigator' : 'Clinical Coordinator';

        // 5. Create Profile
        const { data: profileRecord, error: profileErr } = await supabase
          .from('researcher_profiles')
          .insert({
              user_id: userId,
              organization_id: finalOrgId,
              first_name: form.firstName,
              last_name: form.lastName,
              full_name: `${form.firstName} ${form.lastName}`,
              company_name: form.companyName,
              role: systemRole,
              email: form.email,
              phone_number: form.phone,
              verification_doc_path: vPath,
              status: 'pending' 
          })
          .select('id')
          .single();

        if (profileErr) throw new Error(`Profile DB Error: ${profileErr.message}`);

        // 6. Create Team Member Record (OAM IS ALWAYS TRUE)
        const { error: teamErr } = await supabase
          .from('team_members')
          .insert({
              user_id: userId,
              researcher_id: profileRecord.id,
              organization_id: finalOrgId,
              first_name: form.firstName, 
              last_name: form.lastName,
              email: form.email,
              role: systemRole,
              is_oam: true, // Auto-designate account creator as OAM
              is_active: true,
              status: 'pending' 
          });

        if (teamErr) throw teamErr;

        setStep(3);
      } else {
        router.push(isTeamMember ? '/dashboard/researcher' : '/dashboard/patient');
      }
    } catch (err: any) {
      console.error("CRITICAL SIGNUP FAILURE:", err);
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: STAGE 3 SUBMISSION (Roster) ---
  const handleRosterComplete = async (roster: any[]) => {
    setLoading(true);
    try {
        setFinalRoster(roster);
        
        // Filter out the current user if they are an investigator (avoid duplicates)
        // Since OAM is auto-added, we only add OTHER investigators here
        const guestInvestigators = roster.filter(inv => !inv.isOAM);
        
        if (guestInvestigators.length > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: oamMember } = await supabase
              .from('team_members')
              .select('organization_id')
              .eq('user_id', user?.id)
              .single();

            const orgId = oamMember?.organization_id;

            for (const inv of guestInvestigators) {
              const { data: guestProfile, error: profErr } = await supabase
                  .from('researcher_profiles')
                  .insert({
                      organization_id: orgId,
                      company_name: form.companyName,
                      first_name: inv.firstName,
                      last_name: inv.lastName,
                      full_name: `${inv.firstName} ${inv.lastName}`,
                      email: inv.email,
                      role: 'Clinical Investigator', // Default role for invited MDs
                      status: 'pending',
                      is_verified: false
                  })
                  .select('id')
                  .single();

              if (profErr) throw profErr;

              const { error: teamErr } = await supabase
                  .from('team_members')
                  .insert({
                      organization_id: orgId,
                      researcher_id: guestProfile.id,
                      first_name: inv.firstName,
                      last_name: inv.lastName,
                      email: inv.email,
                      role: 'Clinical Investigator',
                      is_active: true,
                      is_oam: false,
                      status: 'invited'
                  });

              if (teamErr) throw teamErr;
            }
        }
        
        setStep(4);
    } catch (err: any) {
        setError("Failed to save roster: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      
      {/* LEFT: BRANDING PANEL */}
      <aside className={`hidden lg:flex w-[40%] p-12 flex-col justify-between relative overflow-hidden ${isResearcher ? 'bg-slate-900' : 'bg-indigo-600'} text-white`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Sparkles className={`h-5 w-5 ${isResearcher ? 'text-slate-900' : 'text-indigo-600'}`} />
            </div>
            Derm<span className="opacity-70">Trials</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-black leading-[1.1] mb-6 tracking-tight">
            {isResearcher ? "Digitize your site's pipeline." : "Advanced skin care starts here."}
          </h1>
          <p className="text-lg opacity-70 leading-relaxed">
            {isResearcher 
              ? "Join the network where top dermatology institutions connect with high-intent patients." 
              : "Access paid clinical trials and cutting-edge treatments before they hit the market."}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-40">
           <span>HIPAA COMPLIANT</span>
           <div className="w-1 h-1 bg-white rounded-full"></div>
           <span>21 CFR PART 11</span>
        </div>
      </aside>

      {/* RIGHT: WIZARD PANEL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="max-w-xl w-full mx-auto px-6 py-12 lg:py-20 flex-1">
          
          {/* STEP INDICATOR */}
          {isResearcher && (
            <div className="flex gap-2 mb-12">
                {[1,2,3,4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? (isResearcher ? 'bg-slate-900' : 'bg-indigo-600') : 'bg-slate-100'}`} />
                ))}
            </div>
          )}

          {/* HEADER */}
          {step < 3 && (
            <header className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    {step === 1 ? "Identify Your Organization" : "Create Your Manager Account"}
                </h2>
                <p className="text-slate-500 font-medium">
                    {step === 1 ? "First, let's see if your clinic is already in our registry." : "Fill in your professional details to anchor this site account."}
                </p>
            </header>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          {/* --- STEP 1: ORGANIZATION SEARCH --- */}
          {isResearcher && step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Search Institution Name</label>
                  <OrganizationSearch onSelect={handleOrgSelection} />
               </div>

               {orgStatus === 'claimed' && (
                 <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 ring-4 ring-slate-100">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Lock className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 rounded-full px-3 py-1 mb-6 backdrop-blur-md">
                            <ShieldCheck className="w-3 h-3 text-rose-300" />
                            <span className="text-[10px] font-black text-rose-200 uppercase tracking-widest">Institutional Record Established</span>
                        </div>
                        
                        <h3 className="text-2xl font-black mb-4 tracking-tight">Access Restricted</h3>
                        
                        <div className="space-y-4 mb-8 text-sm text-slate-300 leading-relaxed font-medium">
                            <p>
                                This organization has already been verified and claimed within the DermTrials network. To maintain our strict security protocols, duplicate institutional registration is restricted.
                            </p>
                            <p>
                                If you are a member of this team, please contact the Organization Account Manager (OAM) below to request a secure invitation link.
                            </p>
                        </div>
                        
                        <div className="bg-white/10 rounded-2xl p-5 border border-white/10 flex items-center gap-4 backdrop-blur-sm">
                            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-0.5">Primary Account Manager</p>
                                <p className="text-lg font-mono text-white tracking-wide font-bold">{claimedByEmail}</p>
                            </div>
                        </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* --- STEP 2: OAM PROFILE --- */}
          {((isResearcher && step === 2) || isPatient || isTeamMember) && (
            <form onSubmit={handleSignup} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              
              {isResearcher && (
                <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><Building className="h-4 w-4" /></div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Registering for:</p>
                            <p className="font-bold text-indigo-900">{form.companyName}</p>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-indigo-700/70 font-medium leading-relaxed italic">
                        "You're the first to register this clinic. You'll be the primary point of contact for setting up the account, adding initial trials for your organization, and providing team access."
                    </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" placeholder="Jane" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" placeholder="Doe" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Email <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                    <input type="email" required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" placeholder="name@clinic.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              {isResearcher && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Phone <span className="text-red-500">*</span></label>
                      <input 
                        type="tel" 
                        required 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" 
                        placeholder="(555) 123-4567" 
                        value={form.phone} 
                        onChange={handlePhoneChange} 
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">I am the... <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                            required
                            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                            value={form.roleType}
                            onChange={e => setForm({...form, roleType: e.target.value})}
                        >
                            <option value="" disabled>Select your account role...</option>
                            <option value="Coordinator">Clinical Coordinator</option>
                            <option value="Investigator">Clinical Investigator (MD / DO)</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-4 h-5 w-5 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Verification</label>
                            <span className="bg-indigo-50500 text-[9px] font-black px-2 py-0.5 rounded">REQUIRED</span>
                        </div>
                        <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 transition-all group">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => setVerificationFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="flex flex-col items-center text-center gap-3">
                                {verificationFile ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <Upload className="h-8 w-8 text-slate-500 group-hover:text-indigo-400" />}
                                <div className="text-sm font-bold">
                                    {verificationFile ? verificationFile.name : (form.roleType === 'Investigator' ? "Upload Medical License" : "Upload Business License")}
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Supports PDF, PNG, JPG</p>
                            </div>
                        </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm <span className="text-red-500">*</span></label>
                  <input type="password" required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold" placeholder="••••••••" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} />
                </div>
              </div>
              
              <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold uppercase tracking-wide">Password Requirements:</span> At least 8 characters, one number, and one special character (!@#$%^&*).
              </div>

              <label className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer group">
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1 h-5 w-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-xs text-slate-500 leading-relaxed font-medium group-hover:text-slate-700 transition-colors">
                    I agree to the <Link href="/terms" className="text-indigo-600 font-bold hover:underline">Terms</Link> and <Link href="/privacy" className="text-indigo-600 font-bold hover:underline">Privacy Policy</Link>. 
                    I verify I am authorized to register this organization.
                </span>
              </label>

              <button type="submit" disabled={loading} className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all ${loading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 hover:-translate-y-1'}`}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue to Research Team <ChevronRight className="h-5 w-5" /></>}
              </button>
            </form>
          )}

          {/* --- STEP 3 & 4 (Roster & Protocols) remain identical --- */}
          {isResearcher && step === 3 && (
            <InvestigatorRoster 
                oamInfo={{...form, isInvestigator: form.roleType === 'Investigator'}} // Pass boolean to Roster
                onBack={() => setStep(2)}
                onComplete={handleRosterComplete}
            />
          )}

          {isResearcher && step === 4 && (
            <ProtocolAssignment 
                organizationId={form.organizationId}
                organizationName={form.companyName}
                roster={finalRoster}
                onBack={() => setStep(3)}
                onComplete={() => router.push('/dashboard/researcher')}
            />
          )}

          {/* FOOTER */}
          <footer className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
             </p>
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Site Registration
             </div>
          </footer>
        </div>
      </main>
    </div>
  );
}