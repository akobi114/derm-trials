"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; 
import { useRouter } from "next/navigation"; 
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase"; 
import { 
  Users, Star, UserCheck, Phone, Mail, FileText, 
  Settings, ArrowRight, Loader2, 
  FlaskConical, X, BookOpen, CheckCircle2, XCircle, HelpCircle, 
  Send, ChevronDown, ChevronRight, Save, AlertTriangle, PenLine, Undo2, User
} from "lucide-react";

export default function PatientPipeline() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['review']);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // --- 1. SECURITY CHECK ---
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setAuthLoading(false);
        fetchLeads();
      }
    }
    checkUser();
  }, [router]);

  // --- 2. FETCH DATA ---
  async function fetchLeads() {
    setLoading(true);
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      setLoading(false);
      return;
    }

    if (leadsData && leadsData.length > 0) {
      const trialIds = Array.from(new Set(leadsData.map(l => l.trial_id)));
      const { data: trialsData, error: trialsError } = await supabase
        .from('trials')
        .select('nct_id, title, screener_questions, inclusion_criteria')
        .in('nct_id', trialIds);

      if (!trialsError && trialsData) {
        const combinedData = leadsData.map(lead => {
          const relatedTrial = trialsData.find(t => t.nct_id === lead.trial_id);
          return {
            ...lead,
            trial_title: relatedTrial?.title || "Unknown Trial",
            trial_questions: relatedTrial?.screener_questions || [],
            trial_criteria: relatedTrial?.inclusion_criteria || "Criteria not loaded."
          };
        });
        setLeads(combinedData);
      } else {
        setLeads(leadsData);
      }
    } else {
      setLeads([]);
    }
    setLoading(false);
  }

  // --- 3. ACTIONS & LOGGING ---
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) // Close it
        : [...prev, section] // Open it
    );
  };

  const logAction = async (actionDescription: string) => {
    if (!selectedLead) return;
    
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'numeric', day: 'numeric', year: '2-digit', 
      hour: 'numeric', minute: 'numeric', hour12: true 
    });
    
    const newLogEntry = `• ${actionDescription} (${timestamp})`;
    const currentNotes = noteText || "";
    const updatedNotes = currentNotes ? `${currentNotes}\n${newLogEntry}` : newLogEntry;

    setNoteText(updatedNotes);
    
    const { error } = await supabase
      .from('leads')
      .update({ notes: updatedNotes })
      .eq('id', selectedLead.id);

    if (!error) {
      setLeads(current => current.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes } : l));
      setSelectedLead(prev => ({ ...prev, notes: updatedNotes }));
    }
  };

  const updateLeadStatus = async (id: number, newStatus: string) => {
    setLeads(current => current.map(l => l.id === id ? { ...l, status: newStatus } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, status: newStatus }));
    
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error("Database Update Failed:", error.message);
      alert(`Error saving status. Check permissions.`);
      fetchLeads();
    }
  };

  const saveNoteManual = async () => {
    if (!selectedLead) return;
    setSavingNote(true);
    const { error } = await supabase.from('leads').update({ notes: noteText }).eq('id', selectedLead.id);
    if (!error) {
      setLeads(current => current.map(l => l.id === selectedLead.id ? { ...l, notes: noteText } : l));
      setSelectedLead(prev => ({ ...prev, notes: noteText }));
    }
    setSavingNote(false);
  };

  // --- 4. METRICS ---
  const totalLeads = leads.length;
  const strongLeadsCount = leads.filter(l => l.status.includes('Strong')).length;
  const sentCount = leads.filter(l => l.status === 'Sent to Site').length;
  const referredCount = leads.filter(l => l.status === 'Referred').length;
  const rejectedCount = leads.filter(l => l.status === 'Rejected').length;
  
  const conversionRate = totalLeads > 0 ? ((referredCount / totalLeads) * 100).toFixed(1) : "0.0";
  const qualityScore = totalLeads > 0 ? ((strongLeadsCount / totalLeads) * 100).toFixed(0) : "0";

  // --- 5. BUCKETS ---
  const isNew = (s: string) => ['Strong Lead', 'Unlikely - Review Needed', 'New'].includes(s);
  
  const leadsToReview = leads
    .filter(l => isNew(l.status))
    .sort((a, b) => {
      const isAStrong = a.status.includes('Strong');
      const isBStrong = b.status.includes('Strong');
      if (isAStrong && !isBStrong) return -1; 
      if (!isAStrong && isBStrong) return 1;  
      return 0; 
    });

  const leadsPending = leads.filter(l => l.status === 'Pending');
  const leadsSent = leads.filter(l => l.status === 'Sent to Site');
  const leadsRejected = leads.filter(l => l.status === 'Rejected');
  const leadsReferred = leads.filter(l => l.status === 'Referred');

  // --- 6. HELPERS ---
  const isDuplicate = (email: string) => email && leads.filter(l => l.email && l.email.toLowerCase() === email.toLowerCase()).length > 1;
  const getRejectEmailLink = (lead) => `mailto:${lead.email}?subject=Update regarding your application for ${lead.trial_id}&body=Hi ${lead.name},%0D%0A%0D%0AThank you for your interest in the clinical trial: ${lead.trial_title}.%0D%0A%0D%0AUpon further review of your screener answers against the study protocols, we have determined that you do not meet the specific inclusion criteria required for this study at this time.%0D%0A%0D%0AWe appreciate you taking the time to apply.%0D%0A%0D%0ABest regards,%0D%0ADermTrials.Health`;
  const getMoreInfoEmailLink = (lead) => `mailto:${lead.email}?subject=Additional information needed for ${lead.trial_id}&body=Hi ${lead.name},%0D%0A%0D%0AThank you for your interest in the clinical trial: ${lead.trial_title}.%0D%0A%0D%0ABased on your answers, we need a little more information to determine if you fully qualify for this study. Could you please clarify a few details regarding your medical history?%0D%0A%0D%0A[INSERT SPECIFIC QUESTION HERE]%0D%0A%0D%0ABest regards,%0D%0ADermTrials.Health`;
  const getTrialCoordinatorEmailLink = (lead: any) => {
    let answersText = "";
    if (lead.trial_questions && lead.answers) {
      lead.trial_questions.forEach((q: any, idx: number) => {
        answersText += `Q${idx+1}: ${q.question}%0D%0AAnswer: ${lead.answers[idx] || 'N/A'}%0D%0A%0D%0A`;
      });
    }
    const subject = `Potential Candidate for Trial ${lead.trial_id} (ID: #${lead.id})`;
    const body = `Hello Study Coordinator,%0D%0A%0D%0AWe have a patient interested in your trial (${lead.trial_title}) who appears to meet the initial screening criteria.%0D%0A%0D%0AHere are their anonymized responses:%0D%0A%0D%0A------------------%0D%0A${answersText}------------------%0D%0A%0D%0AWould you be interested in connecting with this candidate?%0D%0A%0D%0ABest,%0D%0ADermTrials.Health`;
    return `mailto:coordinator@site.com?subject=${subject}&body=${body}`;
  };

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Patient Pipeline</h1>
            <p className="text-slate-500">Manage incoming applications and eligibility reviews.</p>
          </div>
          <Link href="/admin/system" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
            <Settings className="h-4 w-4" /> Go to System Ops <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Total Applied</p>
            <h2 className="text-2xl font-bold text-slate-900">{totalLeads}</h2>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Star className="h-3 w-3" /> AI Strong Leads</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold text-emerald-900">{strongLeadsCount}</h2>
              <span className="text-xs font-medium text-emerald-600 mb-1">({qualityScore}%)</span>
            </div>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Send className="h-3 w-3" /> Emailed Site</p>
            <h2 className="text-2xl font-bold text-blue-900">{sentCount}</h2>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Referred</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold text-indigo-900">{referredCount}</h2>
              <span className="text-xs font-medium text-indigo-600 mb-1">({conversionRate}%)</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</p>
            <h2 className="text-2xl font-bold text-slate-600">{rejectedCount}</h2>
          </div>
        </div>

        {/* PIPELINE SECTIONS */}
        <div className="space-y-6">
          <PipelineSection title="To Review" count={leadsToReview.length} color="indigo" isOpen={expandedSections.includes('review')} onToggle={() => toggleSection('review')}>
            {leadsToReview.map(lead => <LeadCard key={lead.id} lead={lead} isDup={isDuplicate(lead.email)} onClick={() => { setSelectedLead(lead); setNoteText(lead.notes || ""); }} />)}
            {leadsToReview.length === 0 && <EmptyState msg="Inbox zero! No new leads." />}
          </PipelineSection>

          <PipelineSection title="Pending Info" count={leadsPending.length} color="amber" isOpen={expandedSections.includes('pending')} onToggle={() => toggleSection('pending')}>
            {leadsPending.map(lead => <LeadCard key={lead.id} lead={lead} isDup={isDuplicate(lead.email)} onClick={() => { setSelectedLead(lead); setNoteText(lead.notes || ""); }} />)}
          </PipelineSection>

          <PipelineSection title="Sent to Site" count={leadsSent.length} color="blue" isOpen={expandedSections.includes('sent')} onToggle={() => toggleSection('sent')}>
            {leadsSent.map(lead => <LeadCard key={lead.id} lead={lead} isDup={isDuplicate(lead.email)} onClick={() => { setSelectedLead(lead); setNoteText(lead.notes || ""); }} />)}
          </PipelineSection>

          <PipelineSection title="Referred / Completed" count={leadsReferred.length} color="emerald" isOpen={expandedSections.includes('referred')} onToggle={() => toggleSection('referred')}>
            {leadsReferred.map(lead => <LeadCard key={lead.id} lead={lead} isDup={isDuplicate(lead.email)} onClick={() => { setSelectedLead(lead); setNoteText(lead.notes || ""); }} />)}
          </PipelineSection>

          <div className="pt-8 border-t border-slate-200">
             <button onClick={() => toggleSection('rejected')} className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600">
                {expandedSections.includes('rejected') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                View Rejected History ({leadsRejected.length})
             </button>
             {expandedSections.includes('rejected') && (
               <div className="mt-4 opacity-75">
                 {leadsRejected.map(lead => <LeadCard key={lead.id} lead={lead} isDup={isDuplicate(lead.email)} onClick={() => { setSelectedLead(lead); setNoteText(lead.notes || ""); }} />)}
               </div>
             )}
          </div>
        </div>
      </main>

      {/* --- MODAL: WORKSPACE (3-COLUMN LAYOUT) --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  Review Candidate
                  {isDuplicate(selectedLead.email) && <span className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full border border-red-200"><AlertTriangle className="h-3 w-3" /> Duplicate</span>}
                </h3>
                
                {/* CONTACT INFO BAR */}
                <div className="flex flex-wrap gap-4 mt-2 mb-2 text-sm text-slate-600">
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200 font-bold text-slate-800">
                     <User className="h-3.5 w-3.5 text-indigo-500" />
                     {selectedLead.name}
                   </div>
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200">
                     <Mail className="h-3.5 w-3.5 text-indigo-500" />
                     {selectedLead.email}
                   </div>
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200">
                     <Phone className="h-3.5 w-3.5 text-indigo-500" />
                     {selectedLead.phone || "No Phone"}
                   </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wide">Current Stage:</span>
                  <select 
                    value={selectedLead.status}
                    onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded px-2 py-1 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Strong Lead">New - Strong Lead</option>
                    <option value="Unlikely - Review Needed">New - Needs Review</option>
                    <option value="Pending">Pending Info</option>
                    <option value="Sent to Site">Sent to Site</option>
                    {/* STRICT WORKFLOW: "Referred" disabled unless sent first */}
                    <option 
                      value="Referred" 
                      disabled={selectedLead.status !== 'Sent to Site' && selectedLead.status !== 'Referred'}
                      className="text-slate-400"
                    >
                      Referred (Success) {selectedLead.status !== 'Sent to Site' && selectedLead.status !== 'Referred' ? "(Must send to site first)" : ""}
                    </option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>

            {/* Split View Body */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              
              {/* LEFT: Internal Notes (25%) */}
              <div className="w-full lg:w-1/4 bg-yellow-50/30 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col">
                <div className="p-4 border-b border-yellow-100/50">
                  <h4 className="text-xs font-bold uppercase text-amber-600 mb-1 flex items-center gap-2">
                    <PenLine className="h-3 w-3" /> Internal Notes
                  </h4>
                  {savingNote && <span className="text-[10px] text-amber-500 animate-pulse">Saving...</span>}
                </div>
                <textarea 
                  className="flex-1 w-full p-4 bg-transparent border-none outline-none resize-none text-sm text-slate-700 leading-relaxed placeholder:text-slate-400"
                  placeholder="Notes log here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onBlur={saveNoteManual}
                />
              </div>

              {/* CENTER: Answers (37.5%) */}
              <div className="w-full lg:w-[37.5%] p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100">
                <h4 className="text-xs font-bold uppercase text-indigo-500 mb-4 flex items-center gap-2"><UserCheck className="h-4 w-4" /> Patient Answers</h4>
                <div className="space-y-4">
                  {selectedLead.trial_questions?.map((q: any, index: number) => {
                    const userAnswer = selectedLead.answers ? selectedLead.answers[index] : "N/A";
                    const isCorrect = userAnswer?.toLowerCase() === q.correct_answer?.toLowerCase();
                    return (
                      <div key={index} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                        <p className="text-sm font-bold text-slate-800 mb-2">{index + 1}. {q.question}</p>
                        <div className="flex items-center gap-3 text-sm">
                           <span className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 ${isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                             {isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />} Answered: {userAnswer}
                           </span>
                           {!isCorrect && <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Wanted: {q.correct_answer}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Criteria (37.5%) */}
              <div className="w-full lg:w-[37.5%] p-6 overflow-y-auto bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Reference Criteria</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">{selectedLead.trial_criteria}</pre>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER (ZONED LAYOUT) */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* ZONE 1: REJECT */}
              <div className="flex flex-col gap-2 p-3 bg-red-50/50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Rejection</span>
                <a 
                  href={getRejectEmailLink(selectedLead)} 
                  onClick={() => logAction("Draft opened: Rejection Email")}
                  className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-center text-xs flex items-center justify-center gap-2"
                >
                  <Mail className="h-3 w-3" /> Draft Email
                </a>
                <button onClick={() => updateLeadStatus(selectedLead.id, 'Rejected')} className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-center text-xs flex items-center justify-center gap-2 shadow-sm">
                  <XCircle className="h-3 w-3" /> Move to Rejected
                </button>
              </div>

              {/* ZONE 2: INFO */}
              <div className="flex flex-col gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">More Info</span>
                <a 
                  href={getMoreInfoEmailLink(selectedLead)} 
                  onClick={() => logAction("Draft opened: Info Request Email")}
                  className="w-full py-2 bg-white border border-amber-200 text-amber-600 font-bold rounded-lg hover:bg-amber-50 text-center text-xs flex items-center justify-center gap-2"
                >
                  <Mail className="h-3 w-3" /> Draft Email
                </a>
                <button onClick={() => updateLeadStatus(selectedLead.id, 'Pending')} className="w-full py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 text-center text-xs flex items-center justify-center gap-2 shadow-sm">
                  <HelpCircle className="h-3 w-3" /> Move to Pending
                </button>
              </div>

              {/* ZONE 3: SITE */}
              <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">Trial Site</span>
                <a 
                  href={getTrialCoordinatorEmailLink(selectedLead)} 
                  onClick={() => logAction("Draft opened: Trial Coordinator Email")}
                  className="w-full py-2 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg hover:bg-blue-50 text-center text-xs flex items-center justify-center gap-2"
                >
                  <Mail className="h-3 w-3" /> Draft Email
                </a>
                {/* HIDE "Move to Sent" if already Sent or Referred */}
                {selectedLead.status !== 'Sent to Site' && selectedLead.status !== 'Referred' && (
                  <button onClick={() => updateLeadStatus(selectedLead.id, 'Sent to Site')} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-center text-xs flex items-center justify-center gap-2 shadow-sm">
                    <Send className="h-3 w-3" /> Move to Sent
                  </button>
                )}
              </div>

              {/* ZONE 4: MISC */}
              <div className="flex flex-col gap-2 justify-end">
                {/* STRICT LOGIC: ONLY show if currently "Sent to Site" */}
                {selectedLead.status === 'Sent to Site' ? (
                   <button onClick={() => updateLeadStatus(selectedLead.id, 'Referred')} className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-center text-xs flex items-center justify-center gap-2 shadow-md mb-auto h-full">
                     <CheckCircle2 className="h-4 w-4" /> Mark Referred
                   </button>
                ) : (selectedLead.status === 'Rejected' || selectedLead.status === 'Referred' ? (
                   <button onClick={() => updateLeadStatus(selectedLead.id, 'Strong Lead')} className="w-full py-2 bg-white border border-slate-300 text-slate-500 font-bold rounded-lg hover:text-slate-700 text-center text-xs flex items-center justify-center gap-2 mb-auto">
                     <Undo2 className="h-3 w-3" /> Reset Status
                   </button>
                ) : <div className="flex-1"></div>)}
                
                <button onClick={() => setSelectedLead(null)} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 text-center text-xs">
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HELPERS ---
function PipelineSection({ title, count, color, children, isOpen, onToggle }: any) {
  const colorClasses: any = { indigo: "bg-indigo-50 text-indigo-700 border-indigo-100", amber: "bg-amber-50 text-amber-700 border-amber-100", blue: "bg-blue-50 text-blue-700 border-blue-100", emerald: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div onClick={onToggle} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${colorClasses[color]}`}>{count} Leads</div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
        {isOpen ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
      </div>
      {isOpen && <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">{children}</div>}
    </div>
  );
}

// MODIFIED: Added dynamic highlighting based on 'Strong Lead' status
function LeadCard({ lead, isDup, onClick }: any) {
  const isStrong = lead.status.includes('Strong');
  const needsReview = !isStrong && ['New', 'Unlikely - Review Needed'].includes(lead.status);

  return (
    <div 
      onClick={onClick} 
      className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group relative 
        ${isStrong 
          ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'  
          : 'bg-white border-slate-200 hover:border-indigo-200'           
        }`}
    >
      {isDup && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Duplicate</div>}
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isStrong ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          {isStrong ? <Star className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold truncate ${isStrong ? 'text-emerald-900' : 'text-slate-900'}`}>{lead.name}</h4>
            {/* BADGES */}
            {isStrong && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">AI Match</span>}
            {needsReview && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">Review Needed</span>}
          </div>
          
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-0.5 leading-snug break-words">{lead.trial_title}</p>
            <p className="text-slate-400">Applied: {new Date(lead.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4 border-l border-slate-100/50">
        {lead.notes && <FileText className="h-4 w-4 text-amber-400" />}
        <ChevronRight className={`h-5 w-5 transition-colors ${isStrong ? 'text-emerald-300 group-hover:text-emerald-600' : 'text-slate-300 group-hover:text-indigo-500'}`} />
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-center py-10 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">{msg}</div>;
}