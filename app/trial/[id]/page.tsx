"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown'; 
import { 
  ArrowLeft, MapPin, Building2, 
  FileText, Users, ShieldCheck, ChevronDown, CheckCircle2, FlaskConical, BookOpen,
  Sparkles, Info, ClipboardCheck, Check, X, ArrowRight, Star, UserCheck, PartyPopper, ScanSearch, Lock
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function TrialDetails() {
  const { id } = useParams();
  const [trial, setTrial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- SCREENER STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [screenerStep, setScreenerStep] = useState<'intro' | 'quiz' | 'analyzing' | 'form' | 'success'>('intro');
  const [leadStatus, setLeadStatus] = useState<'Strong Lead' | 'Unlikely - Review Needed'>('Strong Lead');
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
  const [submittingLead, setSubmittingLead] = useState(false);

  useEffect(() => {
    async function fetchTrial() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('nct_id', id)
        .single();

      if (error) console.error("Error fetching trial:", error);
      
      // DEBUG LOG: This will show up in your Chrome Console (Cmd+Opt+J)
      if (data) {
          console.log("Current Status:", data.status); 
          setTrial(data);
      }
      setLoading(false);
    }
    fetchTrial();
  }, [id]);

  // --- MODAL CONTROLS ---
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

  // --- LOGIC: Check Answers ---
  const handleQuizCheck = async () => {
    setScreenerStep('analyzing');
    
    // Fake "processing" delay for better UX
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!trial?.screener_questions) {
        setScreenerStep('form'); 
        return;
    }

    let isMatch = true;
    trial.screener_questions.forEach((q: any, index: number) => {
      // Robust comparison: Trim whitespace and ignore case
      const userAnswer = (answers[index] || "").trim().toLowerCase();
      const correct = (q.correct_answer || "").trim().toLowerCase();

      if (userAnswer !== correct) {
        isMatch = false;
      }
    });

    if (isMatch) {
      setLeadStatus('Strong Lead');
      
      // --- TRIGGER CONFETTI WITH HIGH Z-INDEX ---
      console.log("🎉 Triggering Confetti!"); 
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        // Left side burst
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          zIndex: 9999, // FORCE ON TOP OF MODAL
          colors: ['#4f46e5', '#10b981', '#fbbf24'] 
        });
        // Right side burst
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          zIndex: 9999, // FORCE ON TOP OF MODAL
          colors: ['#4f46e5', '#10b981', '#fbbf24']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      setLeadStatus('Unlikely - Review Needed');
    }

    setScreenerStep('form');
  };

  // --- LOGIC: Submit Lead ---
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);

    const { error } = await supabase
      .from('leads')
      .insert({
        trial_id: trial.nct_id,
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        status: leadStatus, 
        answers: answers
      });

    setSubmittingLead(false);
    if (!error) {
      setScreenerStep('success');
    } else {
      alert("Something went wrong. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === 'recruiting') return { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", glow: true };
    if (s.includes('active') && s.includes('not')) return { badge: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", glow: false };
    if (s.includes('not yet')) return { badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500", glow: false };
    return { badge: "bg-slate-50 text-slate-600 ring-slate-500/10", dot: "bg-slate-400", glow: false };
  };

  const formatDate = (dateStr: string) => (!dateStr || dateStr === 'N/A') ? 'Pending' : dateStr;

  if (loading) return <div className="p-20 text-center text-slate-500">Loading study details...</div>;
  if (!trial) return <div className="p-20 text-center text-red-500">Trial not found.</div>;

  const statusStyle = getStatusColor(trial.status);
  
  // --- STRICT RECRUITING CHECK ---
  // Only show the quiz if status is EXACTLY "recruiting" (case insensitive)
  const isRecruiting = trial.status && trial.status.toLowerCase().trim() === 'recruiting';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      {/* --- MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeScreener}></div>
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                Eligibility Check
              </h3>
              <button onClick={closeScreener} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              
              {/* STEP: INTRO */}
              {screenerStep === 'intro' && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Check Your Eligibility</h4>
                  <p className="text-slate-600 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                    Answer a few simple questions to see if you may qualify for the <strong>{trial.title}</strong> study.
                  </p>
                  <button 
                    onClick={() => setScreenerStep('quiz')}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    Start Questionnaire <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* STEP: QUIZ */}
              {screenerStep === 'quiz' && (
                <div className="space-y-6">
                  <div className="space-y-6">
                    {trial.screener_questions?.map((q: any, idx: number) => (
                      <div key={idx} className="mb-6 last:mb-0">
                        <p className="text-base font-semibold text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {['Yes', 'No'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setAnswers({...answers, [idx]: opt})}
                              className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                                answers[idx] === opt 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                  : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleQuizCheck}
                    disabled={!trial.screener_questions || Object.keys(answers).length < trial.screener_questions.length}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    Check Results
                  </button>
                </div>
              )}

              {/* STEP: ANALYZING */}
              {screenerStep === 'analyzing' && (
                <div className="py-12 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <ScanSearch className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">AI Analysis in Progress</h4>
                  <p className="text-slate-500 text-sm mt-1">Answers being analyzed by AI for eligibility...</p>
                </div>
              )}

              {/* STEP: LEAD FORM */}
              {screenerStep === 'form' && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  
                  {/* DYNAMIC RESULT BOX */}
                  <div className={`p-5 rounded-xl mb-6 flex items-start gap-4 border shadow-sm ${
                    leadStatus === 'Strong Lead' 
                      ? 'bg-emerald-50 border-emerald-100' 
                      : 'bg-indigo-50 border-indigo-100'
                  }`}>
                    {/* Icon Logic */}
                    <div className={`p-3 rounded-xl shrink-0 ${
                       leadStatus === 'Strong Lead' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                       {leadStatus === 'Strong Lead' ? <PartyPopper className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                    </div>

                    {/* Text Logic */}
                    <div>
                      <h5 className={`font-bold text-lg mb-1 ${
                         leadStatus === 'Strong Lead' ? 'text-emerald-900' : 'text-indigo-900'
                      }`}>
                        {leadStatus === 'Strong Lead' ? "🎉 Great News! You May Qualify!" : "📋 Next Step: Human Review"}
                      </h5>
                      <p className={`text-sm leading-relaxed ${
                         leadStatus === 'Strong Lead' ? 'text-emerald-700' : 'text-indigo-700'
                      }`}>
                        {leadStatus === 'Strong Lead' 
                          ? "Your answers suggest you likely match the study requirements. You are one step closer to joining. Submit your info now to secure your connection with the site." 
                          : "Some of your answers require a human expert to interpret. This is common! Submit your details so a study coordinator can manually assess your eligibility."}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                      <input 
                        required type="text" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                      <input 
                        required type="email" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                      <input 
                        required type="tel" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={submittingLead} 
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md mt-2"
                    >
                      {submittingLead ? "Submitting..." : "Submit Information"}
                    </button>
                  </form>
                </div>
              )}

              {/* STEP: SUCCESS */}
              {screenerStep === 'success' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                    <Check className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">We've got it!</h3>
                  <p className="text-slate-600 mb-8">
                    Your information has been sent to the research team. A coordinator will be in touch shortly.
                  </p>
                  <button 
                    onClick={closeScreener} 
                    className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        
        {/* --- SMART BACK BUTTON --- */}
        <Link 
          href={trial?.condition ? `/condition/${encodeURIComponent(trial.condition)}` : "/"}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 
          {trial?.condition ? `Back to ${trial.condition} Trials` : "Back to Search"}
        </Link>

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${statusStyle.badge}`}>
              <span className={`relative flex h-2 w-2`}>
                {statusStyle.glow && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`}></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle.dot}`}></span>
              </span>
              {trial.status}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide rounded-full">
              {trial.phase}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide rounded-full">
              {trial.study_type}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
            {trial.simple_title || trial.title}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-100 mt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-900">{trial.sponsor}</span>
            </div>
            <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full" />
            <div className="flex items-center gap-2">
              <span className="font-medium">NCT ID:</span> {trial.nct_id}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI CLINICAL TRIAL SUMMARY */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative"> 
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">AI Powered Overview</h2>
                  <div className="group relative flex items-center">
                    <Info className="h-4 w-4 text-slate-400 cursor-help hover:text-indigo-600 transition-colors" />
                    <div className="absolute left-1/2 bottom-full mb-3 w-64 -translate-x-1/2 px-4 py-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] text-center leading-relaxed pointer-events-none">
                      <p>This summary is generated by AI and may contain errors. Please review the <strong>Official Study Overview</strong> below for verified medical details.</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-slate-700 text-sm leading-7">
                {trial.simple_summary ? (
                  <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <span className="font-extrabold text-slate-900" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 mb-4" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />
                    }}
                  >
                    {trial.simple_summary}
                  </ReactMarkdown>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                     <p className="text-slate-500 italic">"AI-Generated Simple Summary will appear here after processing."</p>
                  </div>
                )}
              </div>
            </section>

            {/* COLLAPSIBLE TABS */}
            <div className="space-y-4">
              {/* Official Overview */}
              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    Official Study Overview
                  </h3>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{trial.brief_summary || "No summary available."}</p>
                </div>
              </details>

              {/* Study Design */}
              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Study Design & Methods
                  </h3>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <p className="text-slate-500 font-semibold mb-1">Allocation</p>
                        <p className="text-slate-900">{trial.study_design?.allocation || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </details>

              {/* Treatments & Arms */}
              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-indigo-600" />
                    Treatments & Arms
                  </h3>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                  {trial.interventions && trial.interventions.length > 0 ? (
                    <ul className="space-y-6">
                      {trial.interventions.map((item: any, idx: number) => {
                        if (item.data_type === 'arm_group') {
                          return (
                            <li key={idx} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-white px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                                  {item.role}
                                </span>
                              </div>
                              <div className="p-4 space-y-3">
                                {item.description && (
                                  <p className="text-xs text-slate-600 leading-relaxed mb-4 border-b border-slate-100 pb-3">
                                    {item.description}
                                  </p>
                                )}
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Interventions</p>
                                  {item.interventions && item.interventions.length > 0 ? (
                                    item.interventions.map((inv: any, i: number) => (
                                      <div key={i} className="mb-2 last:mb-0">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                                            {inv.type}
                                          </span>
                                          <span className="text-sm font-semibold text-slate-800">{inv.name}</span>
                                        </div>
                                        {inv.description && <p className="text-xs text-slate-500 mt-1 pl-1">{inv.description}</p>}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No specific interventions listed.</span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold uppercase rounded">
                                {item.type}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No specific interventions listed.</p>
                  )}
                </div>
              </details>

              {/* Outcomes */}
              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    What are they measuring?
                  </h3>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-8">
                  {/* Primary */}
                  {trial.primary_outcomes && trial.primary_outcomes.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Primary Goals
                      </h4>
                      <ul className="space-y-4">
                        {trial.primary_outcomes.map((outcome: any, idx: number) => (
                          <li key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-900 text-sm mb-1">{outcome.measure}</p>
                            {outcome.description && <p className="text-xs text-slate-600 mb-2 leading-relaxed border-b border-slate-200 pb-2">{outcome.description}</p>}
                            <p className="text-xs text-slate-400 font-medium">Timeframe: {outcome.timeFrame}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <p className="text-sm text-slate-500 italic">No specific primary outcomes listed.</p>}

                  {/* Secondary */}
                  {trial.secondary_outcomes && trial.secondary_outcomes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Secondary Goals
                      </h4>
                      <details className="group/secondary">
                        <summary className="text-sm font-medium text-indigo-600 cursor-pointer hover:text-indigo-800 flex items-center gap-2">
                          View {trial.secondary_outcomes.length} Secondary Measures
                          <ChevronDown className="h-4 w-4 group-open/secondary:rotate-180 transition-transform" />
                        </summary>
                        <ul className="space-y-4 mt-4">
                          {trial.secondary_outcomes.map((outcome: any, idx: number) => (
                            <li key={idx} className="pl-4 border-l-2 border-slate-200">
                              <p className="font-medium text-slate-800 text-sm">{outcome.measure}</p>
                              {outcome.description && <p className="text-xs text-slate-500 mt-1">{outcome.description}</p>}
                              <p className="text-[10px] text-slate-400 mt-1">Timeframe: {outcome.timeFrame}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}

                  {/* Other Outcomes */}
                  {trial.other_outcomes && trial.other_outcomes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span> Other Measures
                      </h4>
                      <details className="group/other">
                        <summary className="text-sm font-medium text-slate-500 cursor-pointer hover:text-indigo-600 flex items-center gap-2">
                          View {trial.other_outcomes.length} Other Measures
                          <ChevronDown className="h-4 w-4 group-open/other:rotate-180 transition-transform" />
                        </summary>
                        <ul className="space-y-4 mt-4">
                          {trial.other_outcomes.map((outcome: any, idx: number) => (
                            <li key={idx} className="pl-4 border-l-2 border-slate-100">
                              <p className="font-medium text-slate-700 text-sm">{outcome.measure}</p>
                              {outcome.description && <p className="text-xs text-slate-500 mt-1">{outcome.description}</p>}
                              <p className="text-[10px] text-slate-400 mt-1">Timeframe: {outcome.timeFrame}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              </details>

              {/* Eligibility Criteria */}
              <details className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Detailed Criteria Text
                  </h3>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{trial.inclusion_criteria}</pre>
                </div>
              </details>
            </div>
          </div>

          {/* --- RIGHT SIDEBAR: ACTION CENTER --- */}
          <div className="space-y-6">
            
            {/* CTA CARD (Conditional Logic for Recruiting vs Not) */}
            {isRecruiting ? (
              // ACTIVE RECRUITING CARD
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
                 {/* Decorative Gradient */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                 
                 <div className="relative z-10">
                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                      <ClipboardCheck className="h-6 w-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 mb-2">Am I Eligible?</h3>
                   <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                     Take a 1-2 minute questionnaire to see if you match the criteria for this study.
                   </p>
                   <button 
                     onClick={openScreener}
                     className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 flex items-center justify-center gap-2"
                   >
                     Check Eligibility <ArrowRight className="h-4 w-4" />
                   </button>
                 </div>
              </div>
            ) : (
              // NOT RECRUITING / CLOSED CARD
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative overflow-hidden">
                 <div className="relative z-10">
                   <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                      <Lock className="h-6 w-6" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-700 mb-2">Enrollment Closed</h3>
                   <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                     This study is currently <strong>{trial.status ? trial.status.toLowerCase() : 'closed'}</strong> and is not accepting new applicants at this time.
                   </p>
                 </div>
              </div>
            )}

            {/* Locations Box (Button Removed) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Locations
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {trial.locations && trial.locations.length > 0 ? (
                  trial.locations.map((loc: any, idx: number) => (
                    <div key={idx} className="text-sm pb-2 border-b border-slate-50 last:border-0">
                      <p className="font-medium text-slate-900">{loc.city}, {loc.state}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">See ClinicalTrials.gov for locations.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}