"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation'; 
// FIX: Added Loader2 to the import list below
import { 
  ClipboardCheck, X, ShieldCheck, ArrowRight, ScanSearch, 
  PartyPopper, Check, Lock, BookOpen, ChevronDown, FileText, 
  FlaskConical, CheckCircle2, Share2, AlertCircle, Eye, EyeOff, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';

export default function TrialClientLogic({ trial, sidebarMode = false }: { trial: any, sidebarMode?: boolean }) {
  const router = useRouter(); 

  // --- STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [screenerStep, setScreenerStep] = useState<'intro' | 'quiz' | 'analyzing' | 'form' | 'success'>('intro');
  const [leadStatus, setLeadStatus] = useState<'Strong Lead' | 'Unlikely - Review Needed'>('Strong Lead');
  
  // Form State
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);

  // --- DATA PARSING HELPERS ---
  const safeParse = (data: any) => {
    if (!data) return null;
    if (Array.isArray(data) || typeof data === 'object') return data;
    try { return JSON.parse(data); } catch (e) { return null; }
  };

  const interventions = useMemo(() => safeParse(trial.interventions) || [], [trial.interventions]);
  const primaryOutcomes = useMemo(() => safeParse(trial.primary_outcomes) || [], [trial.primary_outcomes]);
  const secondaryOutcomes = useMemo(() => safeParse(trial.secondary_outcomes) || [], [trial.secondary_outcomes]);
  const studyDesign = useMemo(() => safeParse(trial.study_design) || {}, [trial.study_design]);
  const screenerQuestions = useMemo(() => safeParse(trial.screener_questions) || [], [trial.screener_questions]);

  // --- LOGIC ---
  const openScreener = () => {
    setScreenerStep('intro');
    setAnswers({});
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden'; 
  };

  const closeScreener = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto'; 
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: 'DermTrials Research Opportunity',
      text: `I found a paid clinical trial for ${trial.condition} that might interest you.\n\nStudy: ${trial.title}\n\nView details here:`,
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log("Share skipped"); }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleQuizCheck = async () => {
    setScreenerStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!screenerQuestions || screenerQuestions.length === 0) {
        setScreenerStep('form'); 
        return;
    }

    let isMatch = true;
    screenerQuestions.forEach((q: any, index: number) => {
      const userAnswer = (answers[index] || "").trim().toLowerCase();
      const correct = (q.correct_answer || "").trim().toLowerCase();
      if (userAnswer !== correct) isMatch = false;
    });

    if (isMatch) {
      setLeadStatus('Strong Lead');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    } else {
      setLeadStatus('Unlikely - Review Needed');
    }
    setScreenerStep('form');
  };

  // --- SUBMIT LOGIC ---
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);

    // 1. Determine Location (For "Claim Inheritance")
    const primaryLocation = trial.locations && trial.locations.length > 0 ? trial.locations[0] : null;

    try {
        // 2. Sign Up User 
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: leadForm.email,
            password: leadForm.password,
            options: {
                data: {
                    role: 'candidate',
                    full_name: leadForm.name
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Auth failed");

        // 3. Create Candidate Profile
        const nameParts = leadForm.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: profile, error: profileError } = await supabase
            .from('candidate_profiles')
            .upsert({
                user_id: authData.user.id,
                email: leadForm.email,
                phone: leadForm.phone,
                first_name: firstName,
                last_name: lastName
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (profileError) throw profileError;

        // 4. Create Lead 
        const { error: leadError } = await supabase.from('leads').insert({
            trial_id: trial.nct_id,
            candidate_id: profile.id, 
            name: leadForm.name,
            email: leadForm.email,
            phone: leadForm.phone,
            status: leadStatus,
            answers: answers,
            site_city: primaryLocation?.city || 'Unknown',
            site_state: primaryLocation?.state || 'Unknown',
            site_status: 'New'
        });

        if (leadError) throw leadError;

        // 5. Success & Redirect
        setScreenerStep('success');
        
        setTimeout(() => {
            router.push('/dashboard/candidate');
        }, 2000);

    } catch (err: any) {
        console.error("Submission Error:", err);
        if (err.message?.includes('already registered')) {
            alert("This email is already registered. Please log in first.");
        } else {
            alert("Error submitting: " + err.message);
        }
        setSubmittingLead(false);
    }
  };

  const isRecruiting = trial.status && trial.status.toLowerCase().trim() === 'recruiting';

  // --- RENDER SIDEBAR CTA ---
  if (sidebarMode) {
    if (isRecruiting) {
      return (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
             <div className="relative z-10">
               <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><ClipboardCheck className="h-6 w-6" /></div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">Am I Eligible?</h3>
               <p className="text-slate-500 text-sm mb-6 leading-relaxed">Take a 1-2 minute questionnaire to see if you match.</p>
               
               <div className="flex flex-col gap-3">
                 <button onClick={openScreener} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 flex items-center justify-center gap-2">
                   Check Eligibility <ArrowRight className="h-4 w-4" />
                 </button>
                 <button onClick={handleShare} className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                   <Share2 className="h-4 w-4" /> Share with a Friend
                 </button>
               </div>
             </div>
          </div>
          {/* MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeScreener}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /> Eligibility Check</h3>
                  <button onClick={closeScreener} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                  {screenerStep === 'intro' && (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck className="h-8 w-8" /></div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Check Your Eligibility</h4>
                      <p className="text-slate-600 mb-8 max-w-xs mx-auto text-sm leading-relaxed">Answer a few questions for <strong>{trial.title}</strong>.</p>
                      <button onClick={() => setScreenerStep('quiz')} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">Start <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  )}
                  {screenerStep === 'quiz' && (
                    <div className="space-y-6">
                      <div className="space-y-6">
                        {screenerQuestions?.map((q: any, idx: number) => (
                          <div key={idx} className="mb-6 last:mb-0">
                            <p className="text-base font-semibold text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                            <div className="grid grid-cols-2 gap-3">
                              {['Yes', 'No'].map((opt) => (
                                <button key={opt} onClick={() => setAnswers({...answers, [idx]: opt})} className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${answers[idx] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleQuizCheck} disabled={!screenerQuestions || Object.keys(answers).length < screenerQuestions.length} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 mt-4">Check Results</button>
                    </div>
                  )}
                  {screenerStep === 'analyzing' && (
                    <div className="py-12 text-center">
                      <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        <ScanSearch className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 animate-pulse" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">AI Analysis in Progress</h4>
                    </div>
                  )}
                  {screenerStep === 'form' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <div className={`p-5 rounded-xl mb-6 flex items-start gap-4 border shadow-sm ${leadStatus === 'Strong Lead' ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className={`p-3 rounded-xl shrink-0 ${leadStatus === 'Strong Lead' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                           {leadStatus === 'Strong Lead' ? <PartyPopper className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                        </div>
                        <div>
                          <h5 className={`font-bold text-lg mb-1 ${leadStatus === 'Strong Lead' ? 'text-emerald-900' : 'text-indigo-900'}`}>{leadStatus === 'Strong Lead' ? "🎉 Great News!" : "📋 Human Review Needed"}</h5>
                          <p className={`text-sm leading-relaxed ${leadStatus === 'Strong Lead' ? 'text-emerald-700' : 'text-indigo-700'}`}>Create your patient portal to track this application.</p>
                        </div>
                      </div>
                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label><input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} /></div>
                        
                        {/* PASSWORD FIELD */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Create Password</label>
                            <div className="relative">
                                <input 
                                    required 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                                    value={leadForm.password} 
                                    onChange={e => setLeadForm({...leadForm, password: e.target.value})} 
                                    minLength={6}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Min 6 characters. Used to log in to your dashboard.</p>
                        </div>

                        <button type="submit" disabled={submittingLead} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md mt-2">{submittingLead ? "Creating Account..." : "Submit & Create Account"}</button>
                      </form>
                    </div>
                  )}
                  {screenerStep === 'success' && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="h-10 w-10" /></div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h3>
                      <p className="text-slate-500 text-sm mb-6">Redirecting you to your patient dashboard...</p>
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      );
    } else {
      return (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative overflow-hidden">
           <div className="relative z-10">
             <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center mb-4"><Lock className="h-6 w-6" /></div>
             <h3 className="text-lg font-bold text-slate-700 mb-2">Enrollment Closed</h3>
             <p className="text-slate-500 text-sm mb-4 leading-relaxed">This study is currently <strong>{trial.status?.toLowerCase()}</strong>.</p>
           </div>
        </div>
      );
    }
  }

  // --- RENDER MAIN CONTENT ACCORDIONS ---
  return (
    <div className="space-y-4">
      {/* 1. Official Overview */}
      <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /> Official Study Overview</h3>
          <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-6 pb-6 border-t border-slate-100 pt-6 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Brief Summary</h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{trial.brief_summary || "No brief summary available."}</p>
          </div>
          {trial.detailed_summary && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pt-4 border-t border-slate-100">Detailed Description</h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{trial.detailed_summary}</p>
            </div>
          )}
        </div>
      </details>
      {/* (Other details tags same as before...) */}
    </div>
  );
}