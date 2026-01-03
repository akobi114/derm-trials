"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, CheckCircle2, ChevronRight, ArrowLeft, ArrowRight,
  ShieldCheck, Info, UserPlus, Lock, AlertCircle, 
  MapPin, Navigation, Mail, Phone, User, Eye, EyeOff, Check, Activity,
  BookOpen, FlaskConical, Syringe, Target, Clock, ClipboardCheck, Share2
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

// --- HELPER: EXACT DISTANCE FORMULA ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

// --- SMART LOCATION PICKER ---
function SmartLocationPicker({ locations, userZip, selected, onSelect }: any) {
  const [sortedLocs, setSortedLocs] = useState<any[]>([]);
  const [loadingDistances, setLoadingDistances] = useState(false);

  useEffect(() => {
    async function sortLocations() {
      if (!locations || locations.length === 0) return;
      if (!userZip) { setSortedLocs(locations); return; }
      setLoadingDistances(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${userZip}`);
        if (!res.ok) throw new Error("Zip not found");
        const data = await res.json();
        const userLat = parseFloat(data.places[0].latitude);
        const userLon = parseFloat(data.places[0].longitude);
        const withDist = locations.map((loc: any) => {
          let dist = 9999; 
          const lat = loc.geoPoint?.lat || loc.lat || loc.latitude;
          const lon = loc.geoPoint?.lon || loc.long || loc.longitude;
          if (lat && lon) dist = calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon));
          return { ...loc, _distance: dist };
        });
        setSortedLocs(withDist.sort((a: any, b: any) => a._distance - b._distance));
      } catch (err) { setSortedLocs(locations); } finally { setLoadingDistances(false); }
    }
    sortLocations();
  }, [locations, userZip]);

  return (
    <div className="space-y-3">
      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
        {sortedLocs.map((loc: any, idx: number) => {
          const isSelected = selected?.facility === loc.facility;
          return (
            <div key={idx} onClick={() => onSelect(loc)} className={`p-4 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{loc.city}, {loc.state}</p>
                  <p className="text-xs text-slate-500 truncate">{loc.facility}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExpressScreener() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const claimId = searchParams.get('claim_id');
  const userZip = searchParams.get('ref_zip');
  const facilityParam = searchParams.get('facility'); // <--- NEW: Grab facility from URL

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'consent' | 'quiz' | 'analyzing' | 'location' | 'signup' | 'success'>('consent');
  const [trial, setTrial] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [leadStatus, setLeadStatus] = useState<'Strong Lead' | 'Unlikely - Review Needed'>('Strong Lead');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const [leadForm, setLeadForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeParse = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return JSON.parse(data); } catch (e) { return []; }
  };

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data: trialData } = await supabase.from('trials').select('*').eq('nct_id', params.nct_id).single();
      setTrial(trialData);

      if (claimId) {
        const { data: claimData } = await supabase.from('claimed_trials').select('*, researcher_profiles(*)').eq('id', claimId).single();
        setProfile(claimData?.researcher_profiles);
      }
      setLoading(false);
    }
    fetchData();
  }, [params.nct_id, claimId]);

  const questions = useMemo(() => safeParse(trial?.screener_questions), [trial]);
  const locationsList = useMemo(() => safeParse(trial?.locations), [trial]);

  // --- NEW: AUTO-SELECT LOCATION FROM URL PARAM ---
  useEffect(() => {
    if (facilityParam && locationsList.length > 0) {
      const decodedFacility = decodeURIComponent(facilityParam).toLowerCase().trim();
      const matched = locationsList.find((l: any) => 
        (l.facility || "").toLowerCase().trim() === decodedFacility ||
        (l.city || "").toLowerCase().trim() === decodedFacility
      );
      if (matched) {
        setSelectedLocation(matched);
        console.log("📍 Express Screener locked to site:", matched.facility);
      }
    }
  }, [facilityParam, locationsList]);

  const handleAnswer = (val: string) => {
    setAnswers({ ...answers, [currentQIndex]: val });
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      processResults();
    }
  };

  const processResults = async () => {
    setStep('analyzing');
    await new Promise(r => setTimeout(r, 2000));

    let isMatch = true;
    questions.forEach((q: any, idx: number) => {
        const userAns = (answers[idx] || "").trim().toLowerCase();
        const correct = (q.correct_answer || "").trim().toLowerCase();
        if (userAns !== "i don't know" && userAns !== correct) isMatch = false;
    });

    setLeadStatus(isMatch ? 'Strong Lead' : 'Unlikely - Review Needed');
    if (isMatch) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    // --- UPDATED BRANCHING: SKIP LOCATION PICKER IF PRE-SELECTED ---
    if (selectedLocation) {
        setStep('signup');
    } else if (locationsList.length > 0) {
        setStep('location');
    } else {
        setStep('signup');
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leadForm.password !== leadForm.confirmPassword) return alert("Passwords do not match");
    if (!agreedToTerms) return alert("Please agree to terms");
    setIsSubmitting(true);

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: leadForm.email,
            password: leadForm.password,
            options: { data: { role: 'candidate', full_name: `${leadForm.firstName} ${leadForm.lastName}` } }
        });
        if (authError) throw authError;

        const { data: candProfile } = await supabase.from('candidate_profiles').upsert({
            user_id: authData.user?.id, email: leadForm.email, phone: leadForm.phone,
            first_name: leadForm.firstName, last_name: leadForm.lastName
        }).select().single();

        await supabase.from('leads').insert({
            trial_id: trial.nct_id, candidate_id: candProfile.id, user_id: authData.user?.id,
            name: `${leadForm.firstName} ${leadForm.lastName}`, email: leadForm.email, phone: leadForm.phone,
            status: leadStatus, answers: answers, site_facility: selectedLocation?.facility || '',
            site_city: selectedLocation?.city || 'Unknown', site_state: selectedLocation?.state || 'Unknown', site_status: 'New'
        });

        setStep('success');
        setTimeout(() => router.push('/dashboard/candidate'), 2000);
    } catch (err: any) { alert(err.message); setIsSubmitting(false); }
  };

  if (loading || isMobile === null) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  // -------------------------------------------------------------
  // DESKTOP VIEW: Professional Accordion Layout
  // -------------------------------------------------------------
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 flex justify-between items-center">
           <div className="flex items-center gap-3">
              {profile?.logo_url ? <img src={profile.logo_url} className="h-8 w-auto" /> : <div className="p-2 bg-indigo-600 rounded text-white font-black">D</div>}
              <span className="font-bold text-slate-700 tracking-wide uppercase text-xs">{profile?.company_name || "DermTrials"}</span>
           </div>
           <ShieldCheck className="text-emerald-500 h-5 w-5" />
        </header>

        <main className="max-w-5xl mx-auto p-8 flex gap-8">
           {/* LEFT: TRIAL DETAILS */}
           <div className="flex-1 space-y-4">
              <div className="mb-6">
                 <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">Recruiting</span>
                 <h1 className="text-2xl font-black text-slate-900 leading-tight">{trial.title}</h1>
              </div>

              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" open>
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /> Overview</h3>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 text-slate-600 text-sm leading-relaxed">
                  {trial.brief_summary || "No summary available."}
                </div>
              </details>

              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /> Eligibility</h3>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 text-slate-600 text-sm font-mono whitespace-pre-wrap">
                  {trial.inclusion_criteria || "No criteria listed."}
                </div>
              </details>
           </div>

           {/* RIGHT: STICKY SCREENER */}
           <div className="w-[400px] shrink-0">
              <div className="sticky top-24">
                 {step === 'consent' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                       <h3 className="text-xl font-black mb-4 text-slate-900">See if you qualify.</h3>
                       
                       {/* NEW: SITE CONTEXT BADGE */}
                       {selectedLocation && (
                        <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 text-left animate-in fade-in slide-in-from-top-2">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                <MapPin className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Applying to Site:</p>
                                <p className="text-xs font-bold text-indigo-900 leading-tight">{selectedLocation.facility}</p>
                            </div>
                        </div>
                       )}

                       <div className="space-y-3 mb-6">
                          <div className="flex gap-3 text-sm text-slate-600"><Lock className="h-5 w-5 text-indigo-600 shrink-0" /> Secure & Encrypted</div>
                          <div className="flex gap-3 text-sm text-slate-600"><Info className="h-5 w-5 text-indigo-600 shrink-0" /> Voluntary & Private</div>
                       </div>
                       <button onClick={() => setStep('quiz')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          Start Screener <ArrowRight className="h-4 w-4" />
                       </button>
                    </div>
                 )}

                 {step === 'quiz' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-in fade-in">
                       <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase"><span>Question {currentQIndex + 1}</span><span>{Math.round(((currentQIndex + 1) / questions.length) * 100)}%</span></div>
                       <div className="h-1 bg-slate-100 rounded-full mb-6"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div></div>
                       
                       <h4 className="font-bold text-lg mb-6">{questions[currentQIndex]?.question}</h4>
                       <div className="space-y-3">
                          {['Yes', 'No', "I Don't Know"].map(opt => (
                             <button key={opt} onClick={() => handleAnswer(opt)} className="w-full py-3 border-2 border-slate-100 rounded-xl font-bold hover:border-indigo-600 hover:text-indigo-700 transition-all text-left px-4">{opt}</button>
                          ))}
                       </div>
                    </div>
                 )}

                 {step === 'analyzing' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                       <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
                       <h4 className="font-bold text-lg">Analyzing...</h4>
                    </div>
                 )}

                 {(step === 'location' || step === 'signup') && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-in slide-in-from-bottom-4">
                       {step === 'location' ? (
                          <>
                             <h3 className="font-black text-xl mb-4">Select Location</h3>
                             <SmartLocationPicker locations={locationsList} userZip={userZip} selected={selectedLocation} onSelect={setSelectedLocation} />
                             <button onClick={() => setStep('signup')} disabled={!selectedLocation} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">Continue</button>
                          </>
                       ) : (
                          <form onSubmit={handleFinalSubmit} className="space-y-3">
                             <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm font-bold flex items-center gap-2 mb-4"><CheckCircle2 className="h-4 w-4" /> You Match! Create Portal:</div>
                             
                             {/* Only show picker fallback if no location pre-selected */}
                             {!selectedLocation && (
                                <div className="mb-4">
                                   <SmartLocationPicker locations={locationsList} userZip={userZip} selected={selectedLocation} onSelect={setSelectedLocation} />
                                </div>
                             )}

                             <div className="grid grid-cols-2 gap-2">
                                <input required placeholder="First" className="p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.firstName} onChange={e => setLeadForm({...leadForm, firstName: e.target.value})} />
                                <input required placeholder="Last" className="p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.lastName} onChange={e => setLeadForm({...leadForm, lastName: e.target.value})} />
                             </div>
                             <input required type="email" placeholder="Email" className="w-full p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                             <input required type="tel" placeholder="Phone" className="w-full p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
                             <input required type="password" placeholder="Password" className="w-full p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.password} onChange={e => setLeadForm({...leadForm, password: e.target.value})} />
                             <input required type="password" placeholder="Confirm" className="w-full p-3 bg-slate-50 border rounded-lg text-sm" value={leadForm.confirmPassword} onChange={e => setLeadForm({...leadForm, confirmPassword: e.target.value})} />
                             
                             <label className="flex gap-2 items-start py-2">
                                <input type="checkbox" className="mt-1" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                                <span className="text-[10px] text-slate-500">I agree to Terms & Privacy. I consent to SMS/Email updates.</span>
                             </label>

                             <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
                                {isSubmitting ? "Processing..." : "Submit Application"}
                             </button>
                          </form>
                       )}
                    </div>
                 )}

                 {step === 'success' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                       <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="h-8 w-8" /></div>
                       <h4 className="font-bold text-xl mb-2">Success!</h4>
                       <p className="text-slate-500 text-sm">Redirecting to dashboard...</p>
                    </div>
                 )}
              </div>
           </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MOBILE VIEW: HIGH-END APP EXPERIENCE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-hidden">
      
      {isMobile && step === 'consent' && (
        <>
          <div className="absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* HEADER */}
      <header className="pt-12 px-8 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-2">
            {profile?.logo_url ? (
                <img src={profile.logo_url} className="h-6 w-auto object-contain" />
            ) : (
                <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
            )}
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">{profile?.company_name || 'DermTrials'}</span>
        </div>
        {step !== 'consent' && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
      </header>

      <main className="flex-1 px-8 py-6 w-full z-10 flex flex-col">
        {step === 'consent' && (
          <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-lg flex items-center justify-center relative">
                <Activity className="text-indigo-600 h-6 w-6" />
            </div>

            <h1 className="text-[40px] font-black text-slate-900 leading-[1.05] tracking-tight mb-5">
              Check your <br />
              <span className="text-indigo-600">eligibility.</span>
            </h1>

            <p className="text-[17px] text-slate-500 font-medium leading-relaxed max-w-[90%] mb-8">
              Answer a few quick questions to see if you qualify for this dermatology study.
            </p>

            {/* NEW: MOBILE SITE CONTEXT BADGE */}
            {selectedLocation && (
              <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-[1.25rem] flex items-center gap-4 text-left animate-in fade-in slide-in-from-top-2">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <MapPin className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Applying to Site:</p>
                      <p className="text-sm font-bold text-indigo-900 leading-tight">{selectedLocation.facility}</p>
                  </div>
              </div>
            )}

            <div className="flex-1" />

            <div className="pb-8">
              <button 
                onClick={() => setStep('quiz')} 
                className="group relative w-full bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-[1.25rem] flex items-center justify-between shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
              >
                <div className="flex flex-col items-start pl-1">
                  <span className="text-[17px] font-bold">Begin Check</span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5 group-hover:text-indigo-300 transition-colors">Takes about 2 minutes</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl group-hover:bg-white group-hover:text-slate-900 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </button>

              <div className="mt-6 text-center flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                  <ShieldCheck className="h-3 w-3" /> Secure & Private
              </div>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="animate-in fade-in mt-10">
            <div className="mb-10">
              <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>Question {currentQIndex + 1}</span><span>{Math.round(((currentQIndex + 1) / questions.length) * 100)}%</span></div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div></div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-12">{questions[currentQIndex]?.question}</h2>
            <div className="grid grid-cols-1 gap-4">
              {['Yes', 'No', "I Don't Know"].map(opt => (
                <button key={opt} onClick={() => handleAnswer(opt)} className="py-5 border-2 border-slate-200 rounded-2xl font-black text-lg hover:border-indigo-600 active:scale-95 transition-all">{opt}</button>
              ))}
            </div>
          </div>
        )}

        {step === 'analyzing' && <div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" /><h2 className="text-xl font-bold">Analyzing Results...</h2></div>}

        {step === 'location' && (
          <div className="animate-in slide-in-from-right-4 mt-10">
            <h2 className="text-2xl font-black mb-6">Select a Clinic</h2>
            <SmartLocationPicker locations={locationsList} userZip={userZip} selected={selectedLocation} onSelect={setSelectedLocation} />
            <button onClick={() => setStep('signup')} disabled={!selectedLocation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black mt-8 disabled:opacity-50">Continue</button>
          </div>
        )}

        {step === 'signup' && (
          <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in slide-in-from-right-4 mt-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8" /></div>
                <h2 className="text-2xl font-black">Great news! You match.</h2>
                <p className="text-slate-500 font-medium">Create your portal to finish your application.</p>
            </div>

            {/* Mobile Location Picker Fallback */}
            {!selectedLocation && locationsList.length > 0 && (
                <div className="mb-4">
                   <SmartLocationPicker locations={locationsList} userZip={userZip} selected={selectedLocation} onSelect={setSelectedLocation} />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <input required placeholder="First Name" className="p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.firstName} onChange={e => setLeadForm({...leadForm, firstName: e.target.value})} />
                <input required placeholder="Last Name" className="p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.lastName} onChange={e => setLeadForm({...leadForm, lastName: e.target.value})} />
            </div>
            <input required type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
            <input required type="tel" placeholder="Phone Number" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
            <div className="relative">
                <input required type={showPassword ? "text" : "password"} placeholder="Create Password" title="Min 6 characters" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.password} onChange={e => setLeadForm({...leadForm, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
            </div>
            <input required type={showPassword ? "text" : "password"} placeholder="Confirm Password" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={leadForm.confirmPassword} onChange={e => setLeadForm({...leadForm, confirmPassword: e.target.value})} />
            
            <label className="flex items-start gap-3 py-4">
                <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                <p className="text-[10px] text-slate-500 leading-relaxed">I agree to the <Link href="/terms" className="text-indigo-600 font-bold">Terms</Link> & <Link href="/privacy" className="text-indigo-600 font-bold">Privacy Policy</Link>. I consent to receive automated calls, emails, and SMS from DermTrials regarding this study. Opt-out anytime.</p>
            </label>

            <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg disabled:opacity-50">
                {isSubmitting ? "Processing..." : "Submit Application"}
            </button>
          </form>
        )}

        {step === 'success' && <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95"><div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"><Check className="h-10 w-10" /></div><h2 className="text-2xl font-black mb-2">Success!</h2><p className="text-slate-500 font-medium">Redirecting to your dashboard...</p></div>}
      </main>
    </div>
  );
}