"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { 
  ClipboardCheck, X, ShieldCheck, ArrowRight, ScanSearch, 
  PartyPopper, Check, Lock, BookOpen, ChevronDown, FileText, 
  FlaskConical, CheckCircle2, Share2, AlertCircle, Eye, EyeOff, 
  Loader2, HelpCircle, Target, Syringe, Clock, Tags, Pill, Activity,
  Phone, Mail, User, MapPin, Navigation, LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import Link from 'next/link';

// --- HELPER: HAVERSINE DISTANCE FORMULA ---
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

// --- INTERNAL COMPONENT: SMART LOCATION PICKER ---
function SmartLocationPicker({ locations, userZip, selected, onSelect }: any) {
  const [sortedLocs, setSortedLocs] = useState<any[]>([]);
  const [loadingDistances, setLoadingDistances] = useState(false);

  useEffect(() => {
    async function sortLocations() {
      if (!locations || locations.length === 0) return;

      if (!userZip) {
        setSortedLocs(locations); 
        return;
      }

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

          if (lat && lon) {
            dist = calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon));
          }
          return { ...loc, _distance: dist };
        });

        const sorted = withDist.sort((a: any, b: any) => a._distance - b._distance);
        setSortedLocs(sorted);

      } catch (err) {
        console.warn("Location sort failed, falling back to default", err);
        setSortedLocs(locations);
      } finally {
        setLoadingDistances(false);
      }
    }

    sortLocations();
  }, [locations, userZip]);

  if (!locations || locations.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
        Select Preferred Location {loadingDistances && <span className="text-slate-400 font-normal normal-case animate-pulse">(Finding closest...)</span>}
      </label>
      
      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
        {sortedLocs.map((loc: any, idx: number) => {
          const isSelected = selected?.facility === loc.facility;
          const isNearby = loc._distance !== undefined && loc._distance < 100;

          return (
            <div 
              key={idx}
              onClick={() => onSelect(loc)}
              className={`
                relative p-4 cursor-pointer transition-all hover:bg-slate-50
                ${isSelected ? 'bg-indigo-50/60' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                  ${isSelected ? 'border-indigo-600' : 'border-slate-300'}
                `}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {loc.city}, {loc.state}
                    </p>
                    {isNearby && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                        <Navigation className="h-3 w-3" /> {Math.round(loc._distance)} mi
                      </span>
                    )}
                  </div>
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

// --- MAIN EXPORT ---
export default function TrialClientLogic({ trial, sidebarMode = false, userZip }: { trial: any, sidebarMode?: boolean, userZip?: string }) {
  const router = useRouter(); 

  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [existingLead, setExistingLead] = useState<any>(null); // <--- NEW: Track prior application
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [screenerStep, setScreenerStep] = useState<'intro' | 'quiz' | 'analyzing' | 'form' | 'location_select' | 'success'>('intro');
  const [leadStatus, setLeadStatus] = useState<'Strong Lead' | 'Unlikely - Review Needed'>('Strong Lead');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const [leadForm, setLeadForm] = useState({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      password: '', 
      confirmPassword: '' 
  });
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);

  useEffect(() => {
    const checkUserAndLead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // --- NEW: Check if this user already applied to this trial ---
        if (user && trial.nct_id) {
            const { data: lead } = await supabase
                .from('leads')
                .select('status, site_status')
                .eq('user_id', user.id)
                .eq('trial_id', trial.nct_id)
                .maybeSingle();
            
            if (lead) setExistingLead(lead);
        }
    };
    checkUserAndLead();
  }, [trial.nct_id]);

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
  const locationsList = useMemo(() => safeParse(trial.locations) || (trial.locations ? trial.locations : []), [trial.locations]);

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

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length <= 14) { 
        setLeadForm({ ...leadForm, phone: formatted });
    }
  };

  const handleQuizCheck = async () => {
    setScreenerStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    let isMatch = true;
    if (screenerQuestions && screenerQuestions.length > 0) {
        screenerQuestions.forEach((q: any, index: number) => {
            const userAnswer = (answers[index] || "").trim().toLowerCase();
            const correct = (q.correct_answer || "").trim().toLowerCase();
            if (userAnswer === "i don't know") { /* Pass */ } 
            else if (userAnswer !== correct) { isMatch = false; }
        });
    }

    const newStatus = isMatch ? 'Strong Lead' : 'Unlikely - Review Needed';
    setLeadStatus(newStatus);

    if (isMatch) {
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    }

    if (currentUser) {
        if (locationsList && locationsList.length > 0) {
            setScreenerStep('location_select');
        } else {
            handleInstantSubmit(newStatus);
        }
    } else {
        setScreenerStep('form');
    }
  };

  const handleInstantSubmit = async (status: string) => {
    setSubmittingLead(true);
    
    if (locationsList.length > 0 && !selectedLocation) {
        alert("Please select a preferred location before submitting.");
        setSubmittingLead(false);
        return;
    }

    const finalLocation = selectedLocation || (locationsList.length > 0 ? locationsList[0] : null);

    try {
        const { data: profile } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        const { error: leadError } = await supabase.from('leads').insert({
            trial_id: trial.nct_id,
            candidate_id: profile?.id, 
            user_id: currentUser.id,   
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'Returning User',
            email: currentUser.email,
            phone: profile?.phone || '',
            status: status,
            answers: answers,
            site_city: finalLocation?.city || 'Unknown',
            site_state: finalLocation?.state || 'Unknown',
            site_facility: finalLocation?.facility || '', 
            site_status: 'New'
        });

        if (leadError) throw leadError;
        setScreenerStep('success');
        setTimeout(() => { router.push('/dashboard/candidate'); }, 2000);
    } catch (err: any) {
        if (!currentUser) {
             setScreenerStep('form');
        } else {
             alert("Error submitting application: " + err.message);
        }
        setSubmittingLead(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);

    if (locationsList && locationsList.length > 0 && !selectedLocation) {
        alert("Please select a specific location (e.g. Scottsdale or Phoenix) to continue.");
        setSubmittingLead(false);
        return; 
    }

    if (!agreedToTerms) {
        alert("Please agree to the Terms & Privacy Policy.");
        setSubmittingLead(false);
        return;
    }

    if (leadForm.password !== leadForm.confirmPassword) {
        alert("Passwords do not match.");
        setSubmittingLead(false);
        return;
    }

    const finalLocation = selectedLocation || (locationsList.length > 0 ? locationsList[0] : null);
    const fullName = `${leadForm.firstName} ${leadForm.lastName}`.trim();

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: leadForm.email,
            password: leadForm.password,
            options: { data: { role: 'candidate', full_name: fullName } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Auth failed");

        const { data: profile, error: profileError } = await supabase
            .from('candidate_profiles')
            .upsert({
                user_id: authData.user.id,
                email: leadForm.email,
                phone: leadForm.phone,
                first_name: leadForm.firstName,
                last_name: leadForm.lastName
            }, { onConflict: 'user_id' })
            .select().single();

        if (profileError) throw profileError;

        const { error: leadError } = await supabase.from('leads').insert({
            trial_id: trial.nct_id,
            candidate_id: profile.id, 
            user_id: authData.user.id, 
            name: fullName,
            email: leadForm.email,
            phone: leadForm.phone,
            status: leadStatus,
            answers: answers,
            site_city: finalLocation?.city || 'Unknown',
            site_state: finalLocation?.state || 'Unknown',
            site_facility: finalLocation?.facility || '',
            site_status: 'New'
        });

        if (leadError) throw leadError;

        setScreenerStep('success');
        setTimeout(() => { router.push('/dashboard/candidate'); }, 2000);

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

  if (sidebarMode) {
    // --- 1. CASE: NOT RECRUITING ---
    if (!isRecruiting) {
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

    // --- 2. CASE: ALREADY APPLIED (The Fix) ---
    if (existingLead) {
        return (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 relative overflow-hidden shadow-sm">
               <div className="relative z-10">
                 <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><CheckCircle2 className="h-6 w-6" /></div>
                 <h3 className="text-lg font-bold text-emerald-900 mb-2">Application Submitted</h3>
                 <p className="text-emerald-700 text-sm mb-6 leading-relaxed">
                    You have already applied for this study. You can track your status in your dashboard.
                 </p>
                 <Link 
                    href="/dashboard/candidate" 
                    className="w-full bg-white text-emerald-700 border border-emerald-200 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                 >
                   <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                 </Link>
               </div>
            </div>
        );
    }

    // --- 3. CASE: STANDARD APPLY BOX ---
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
          
          {/* SCREENER MODAL (Unchanged) */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                      {currentUser && <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">👋 Welcome back! Applying as {currentUser.email}</div>}
                      <button onClick={() => setScreenerStep('quiz')} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">Start <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  )}
                  {screenerStep === 'quiz' && (
                    <div className="space-y-6">
                      <div className="space-y-6">
                        {screenerQuestions?.map((q: any, idx: number) => (
                          <div key={idx} className="mb-6 last:mb-0">
                            <p className="text-base font-semibold text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {['Yes', 'No', "I Don't Know"].map((opt) => (
                                <button key={opt} onClick={() => setAnswers({...answers, [idx]: opt})} className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${answers[idx] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>{opt}</button>
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
                  
                  {/* --- NEW STEP: LOCATION SELECT FOR LOGGED IN USERS --- */}
                  {screenerStep === 'location_select' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3"><MapPin className="h-6 w-6" /></div>
                        <h4 className="text-lg font-bold text-slate-900">One Last Thing</h4>
                        <p className="text-slate-500 text-sm">Please select the location you would like to attend.</p>
                      </div>
                      
                      <SmartLocationPicker 
                          locations={locationsList} 
                          userZip={userZip} 
                          selected={selectedLocation} 
                          onSelect={setSelectedLocation}
                      />

                      <button 
                        onClick={() => handleInstantSubmit(leadStatus)}
                        disabled={!selectedLocation || submittingLead}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md mt-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingLead ? "Submitting..." : "Confirm & Apply"}
                      </button>
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
                        
                        {locationsList && locationsList.length > 0 && (
                             <div className="mb-6 border rounded-xl border-indigo-100 overflow-hidden">
                                 <div className="bg-indigo-50/50 px-4 py-2 border-b border-indigo-100">
                                     <label className="text-xs font-bold text-indigo-900 uppercase">
                                         Select Your Clinic Location <span className="text-red-500">*</span>
                                     </label>
                                 </div>
                                 <SmartLocationPicker 
                                    locations={locationsList} 
                                    userZip={userZip} 
                                    selected={selectedLocation} 
                                    onSelect={setSelectedLocation}
                                 />
                             </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input required type="text" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.firstName} onChange={e => setLeadForm({...leadForm, firstName: e.target.value})} placeholder="Jane" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.lastName} onChange={e => setLeadForm({...leadForm, lastName: e.target.value})} placeholder="Doe" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input required type="email" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} placeholder="jane@example.com" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input required type="tel" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.phone} onChange={handlePhoneChange} placeholder="(555) 123-1234" maxLength={14} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Create Password</label>
                                <div className="relative">
                                    <input required type={showPassword ? "text" : "password"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 pr-10" value={leadForm.password} onChange={e => setLeadForm({...leadForm, password: e.target.value})} minLength={6} placeholder="Min 6 characters" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                                <input required type={showPassword ? "text" : "password"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={leadForm.confirmPassword} onChange={e => setLeadForm({...leadForm, confirmPassword: e.target.value})} placeholder="Retype password" />
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="font-bold mb-1">Security Requirements:</p>
                            <ul className="list-disc pl-3 space-y-0.5">
                                <li className={leadForm.password.length >= 6 ? "text-emerald-600 font-bold" : ""}>At least 6 characters</li>
                                <li className={/[A-Z]/.test(leadForm.password) ? "text-emerald-600 font-bold" : ""}>One uppercase letter</li>
                                <li className={/[0-9]/.test(leadForm.password) ? "text-emerald-600 font-bold" : ""}>One number</li>
                                <li className={leadForm.password === leadForm.confirmPassword && leadForm.password !== "" ? "text-emerald-600 font-bold" : ""}>Passwords must match</li>
                            </ul>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400 shrink-0"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    />
                                    <Check className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" />
                                </div>
                                <div className="text-[11px] text-slate-500 leading-snug">
                                    I agree to the{' '}
                                    <Link href="/terms" target="_blank" className="font-bold text-indigo-600 hover:underline">
                                        Terms
                                    </Link>
                                    {' & '}
                                    <Link href="/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">
                                        Privacy Policy
                                    </Link>
                                    . I verify that this is my number and consent to receive calls, emails, and SMS text messages from DermTrials and participating research sites regarding this study and future clinical trial opportunities. I understand that these messages may be sent using automated technology, but <strong>I can opt-out at any time</strong>. Message/data rates may apply.
                                </div>
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            disabled={submittingLead || !agreedToTerms} 
                            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md mt-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {submittingLead ? "Creating Account..." : "Submit & Create Account"}
                        </button>
                      </form>
                    </div>
                  )}

                  {screenerStep === 'success' && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="h-10 w-10" /></div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentUser ? "Application Submitted!" : "Account Created!"}</h3>
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
  }

  // --- RENDER MAIN CONTENT ACCORDIONS (Unchanged) ---
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

      {/* 2. Study Design */}
      <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FlaskConical className="h-5 w-5 text-indigo-600" /> Study Design</h3>
          <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-6 pb-6 border-t border-slate-100 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Study Type</h4><p className="text-sm font-semibold text-slate-800">{trial.study_type || "N/A"}</p></div>
            <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phase</h4><p className="text-sm font-semibold text-slate-800">{trial.phase || "N/A"}</p></div>
            {studyDesign?.allocation && <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Allocation</h4><p className="text-sm font-semibold text-slate-800">{studyDesign.allocation}</p></div>}
            {studyDesign?.intervention_model && <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model</h4><p className="text-sm font-semibold text-slate-800">{studyDesign.intervention_model}</p></div>}
            {studyDesign?.primary_purpose && <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Purpose</h4><p className="text-sm font-semibold text-slate-800">{studyDesign.primary_purpose}</p></div>}
            {studyDesign?.masking && <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Masking</h4><p className="text-sm font-semibold text-slate-800">{studyDesign.masking}</p></div>}
          </div>
        </div>
      </details>

      {/* 3. Arms & Interventions */}
      {interventions.length > 0 && (
        <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Syringe className="h-5 w-5 text-indigo-600" /> Arms & Interventions</h3>
            <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="border-t border-slate-100">
            {/* Header (Desktop) */}
            <div className="hidden md:grid grid-cols-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
               <div className="px-6 py-3 border-r border-slate-100">Participant Group/Arm</div>
               <div className="px-6 py-3">Intervention/Treatment</div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {interventions.map((arm: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2">
                  {/* Left Column: Arm Info */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                    <span className="inline-block text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wide mb-2 border border-slate-200">
                      {arm.role ? arm.role.replace('_', ' ') : "Arm"}
                    </span>
                    <p className="text-sm text-slate-800 leading-relaxed font-medium">{arm.description || "No description available."}</p>
                  </div>

                  {/* Right Column: Interventions List */}
                  <div className="p-6 bg-white space-y-6">
                    {arm.interventions?.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">{item.type}</span>
                           <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                        </div>
                        {item.description && <p className="text-sm text-slate-600 ml-1 leading-relaxed">• {item.description}</p>}
                        {item.otherNames && item.otherNames.length > 0 && (
                           <div className="ml-1 mt-1 text-xs text-slate-500">
                             <span className="font-bold text-slate-400 mr-1">• Other Names:</span> 
                             <span className="font-mono text-slate-600">{item.otherNames.join(', ')}</span>
                           </div>
                        )}
                      </div>
                    ))}
                    {(!arm.interventions || arm.interventions.length === 0) && <p className="text-sm text-slate-400 italic">No specific interventions listed.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* 4. Outcome Measures */}
      {(primaryOutcomes.length > 0 || secondaryOutcomes.length > 0) && (
        <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Target className="h-5 w-5 text-indigo-600" /> Outcome Measures</h3>
            <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-6 pb-6 border-t border-slate-100 pt-6 space-y-8">
            {primaryOutcomes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Primary Outcomes</h4>
                <div className="space-y-4">
                  {primaryOutcomes.map((o: any, idx: number) => (
                    <div key={idx} className="bg-emerald-50/20 p-5 rounded-xl border border-emerald-100/50 flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                            <p className="font-bold text-slate-900 text-sm leading-snug">{o.measure}</p>
                            {o.timeFrame && (
                                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-100 text-xs font-bold text-emerald-700 shadow-sm">
                                    <Clock className="h-3 w-3" /> {o.timeFrame}
                                </div>
                            )}
                        </div>
                        <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-emerald-100/50 pt-4 md:pt-0 md:pl-6">
                            <p className="text-sm text-slate-600 leading-relaxed">{o.description || "No further description provided."}</p>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {secondaryOutcomes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-t border-slate-100 pt-6">Secondary Outcomes</h4>
                <div className="space-y-4">
                  {secondaryOutcomes.map((o: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                            <p className="font-bold text-slate-800 text-sm leading-snug">{o.measure}</p>
                            {o.timeFrame && (
                                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                                    <Clock className="h-3 w-3" /> {o.timeFrame}
                                </div>
                            )}
                        </div>
                        <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                            <p className="text-sm text-slate-500 leading-relaxed">{o.description || "No further description provided."}</p>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* 5. Criteria */}
      <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /> Eligibility Criteria</h3>
          <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-6 pb-6 border-t border-slate-100 pt-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {trial.inclusion_criteria || "No criteria listed."}
          </div>
        </div>
      </details>
    </div>
  );
}