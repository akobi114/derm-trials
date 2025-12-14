"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link"; 
import { useRouter, useSearchParams } from "next/navigation"; 
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase"; 
import { 
  Users, Star, Phone, Mail, FileText, 
  Settings, ArrowRight, Loader2, 
  CheckCircle2, XCircle, HelpCircle, 
  Send, ChevronDown, ChevronRight, AlertTriangle, User, Trash2,
  MapPin, Building2, Lock, Eye, Activity, Ban, Filter, 
  ArrowLeft, BarChart3, Edit3, MessageSquare, ClipboardList, History,
  LayoutDashboard, CreditCard, Video, Image as ImageIcon, Check, X,
  Clock, TrendingUp, Crown, Calculator, AlertCircle, CheckCheck,
  Percent, DollarSign, MousePointer2, Sparkles, Construction, Search,
  Calendar, Archive, Save, UploadCloud, PieChart
} from "lucide-react";

// 🔒 SECURITY
const ADMIN_EMAIL = "akobic14@gmail.com"; 

// --- TYPES ---
type LeadStatus = 'New' | 'Contacted' | 'Scheduled' | 'Enrolled' | 'Not Eligible' | 'Withdrawn';

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const [loading, setLoading] = useState(true);
  
  // --- TABS & NAVIGATION ---
  const [activeTab, setActiveTab] = useState<'claimed' | 'unclaimed' | 'leads'>('claimed');
  
  // --- GOD MODE STATE ---
  const [viewingClaim, setViewingClaim] = useState<any>(null); 

  // --- DATA STATES ---
  const [leads, setLeads] = useState<any[]>([]); 
  const [claimedTrials, setClaimedTrials] = useState<any[]>([]); 
  const [unclaimedOpportunities, setUnclaimedOpportunities] = useState<any[]>([]); 
  
  // --- FILTER STATE ---
  const [filterNctId, setFilterNctId] = useState<string | null>(null);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [pendingResearchers, setPendingResearchers] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>(['review']);

  // --- 1. SECURITY & INIT ---
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if (user.email !== ADMIN_EMAIL) {
        console.warn("Unauthorized access attempt by:", user.email);
        router.push('/'); return;
      }
      
      await Promise.all([
          fetchLeads(),
          fetchClaimedTrials(), // Updated function below
          fetchUnclaimedOpportunities(),
          fetchPendingResearchersCount()
      ]);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  // --- 2. URL SYNC ---
  useEffect(() => {
      if (!loading && claimedTrials.length > 0) {
          const claimIdFromUrl = searchParams.get('claim_id');
          if (claimIdFromUrl) {
              const claimToView = claimedTrials.find(c => c.id === claimIdFromUrl);
              if (claimToView) setViewingClaim(claimToView);
          }
      }
  }, [loading, claimedTrials, searchParams]);

  const enterGodMode = (claim: any) => {
      setViewingClaim(claim);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('claim_id', claim.id);
      window.history.pushState({}, '', newUrl.toString());
  };

  const exitGodMode = () => {
      setViewingClaim(null);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('claim_id');
      window.history.pushState({}, '', newUrl.toString());
  };

  // --- 4. DATA FETCHING ---
  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select(`*, trials (title, nct_id, screener_questions, inclusion_criteria)`)
      .order('created_at', { ascending: false });

    if (data) {
        const enriched = await Promise.all(data.map(async (lead) => {
            const { data: claim } = await supabase.from('claimed_trials').select('researcher_id, researcher_profiles(company_name, email)').eq('nct_id', lead.trial_id).contains('site_location', { city: lead.site_city, state: lead.site_state }).maybeSingle(); 
            return { ...lead, trial_title: lead.trials?.title, trial_questions: lead.trials?.screener_questions, trial_criteria: lead.trials?.inclusion_criteria, is_claimed: !!claim, researcher: claim ? claim.researcher_profiles : null };
        }));
        setLeads(enriched);
    }
  }

  // UPDATED: Now fetches detailed status counts
  async function fetchClaimedTrials() {
      const { data } = await supabase
        .from('claimed_trials')
        .select(`*, trials (title, screener_questions), researcher_profiles (company_name, full_name, email, phone_number)`)
        .eq('status', 'approved');
      
      if (data) {
          const withCounts = await Promise.all(data.map(async (claim) => {
              // Fetch only the status column for efficiency
              const { data: leadStatuses } = await supabase
                  .from('leads')
                  .select('site_status')
                  .eq('trial_id', claim.nct_id)
                  .eq('site_city', claim.site_location?.city)
                  .eq('site_state', claim.site_location?.state);
              
              const stats = {
                  total: leadStatuses?.length || 0,
                  new: leadStatuses?.filter(l => l.site_status === 'New').length || 0,
                  screening: leadStatuses?.filter(l => l.site_status === 'Contacted').length || 0,
                  scheduled: leadStatuses?.filter(l => l.site_status === 'Scheduled').length || 0,
                  enrolled: leadStatuses?.filter(l => l.site_status === 'Enrolled').length || 0
              };

              return { ...claim, stats };
          }));
          setClaimedTrials(withCounts.sort((a,b) => b.stats.total - a.stats.total));
      }
  }

  async function fetchUnclaimedOpportunities() {
      const { data: activeLeads } = await supabase.from('leads').select('trial_id, site_city, site_state, trials(title)').in('status', ['New', 'Strong Lead', 'Unlikely - Review Needed']);
      if (!activeLeads) return;
      const opportunities: any = {};
      for (const lead of activeLeads) {
          const key = `${lead.trial_id}-${lead.site_city}-${lead.site_state}`;
          if (!opportunities[key]) {
              const { data: claim } = await supabase.from('claimed_trials').select('id').eq('nct_id', lead.trial_id).contains('site_location', { city: lead.site_city, state: lead.site_state }).maybeSingle();
              if (!claim) {
                  opportunities[key] = { id: key, nct_id: lead.trial_id, title: lead.trials?.title, city: lead.site_city, state: lead.site_state, count: 0 };
              }
          }
          if (opportunities[key]) opportunities[key].count++;
      }
      setUnclaimedOpportunities(Object.values(opportunities).sort((a: any, b: any) => b.count - a.count));
  }

  async function fetchPendingResearchersCount() {
    const { count } = await supabase.from('researcher_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false);
    if (count !== null) setPendingResearchers(count);
  }

  // --- ACTIONS ---
  const clearFilter = () => setFilterNctId(null);

  const markTrialClosed = async (opp: any) => {
      if (!confirm(`Are you sure you want to CLOSE ${opp.nct_id} in ${opp.city}? This will archive ${opp.count} pending leads.`)) return;
      const { error } = await supabase.from('leads').update({ status: 'Trial Closed', admin_notes: 'Trial site marked as closed/unresponsive by Admin.' }).eq('trial_id', opp.nct_id).eq('site_city', opp.city).eq('site_state', opp.state).neq('status', 'Trial Closed');
      if (!error) { alert("Trial closed."); fetchUnclaimedOpportunities(); fetchLeads(); } else { alert("Error: " + error.message); }
  };

  const toggleSection = (section: string) => setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
  const deleteLead = async (id: any) => { if (!confirm("Delete lead?")) return; await supabase.from('leads').delete().eq('id', id); setLeads(l => l.filter(x => x.id !== id)); if(selectedLead?.id===id) setSelectedLead(null); };
  const updateLeadStatus = async (id: any, newStatus: string) => { await supabase.from('leads').update({ status: newStatus }).eq('id', id); setLeads(l => l.map(x => x.id === id ? { ...x, status: newStatus } : x)); if(selectedLead?.id===id) setSelectedLead(p => ({...p, status: newStatus})); };
  const saveNoteManual = async () => { if (!selectedLead) return; setSavingNote(true); await supabase.from('leads').update({ admin_notes: noteText }).eq('id', selectedLead.id); setLeads(l => l.map(x => x.id === selectedLead.id ? { ...x, admin_notes: noteText } : x)); setSavingNote(false); };
  const sendInviteEmail = (lead: any) => { alert(`Simulated Invite to Site for ${lead.trial_id}`); }; 

  // --- RENDER ---
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  if (viewingClaim) {
      return (
          <GodModeView 
            claim={viewingClaim} 
            onBack={exitGodMode} 
          />
      );
  }

  const visibleLeads = filterNctId ? leads.filter(l => l.trial_id === filterNctId) : leads;
  const isNew = (s: string) => ['Strong Lead', 'Unlikely - Review Needed', 'New'].includes(s);
  const leadsToReview = visibleLeads.filter(l => isNew(l.status));
  const leadsPending = visibleLeads.filter(l => l.status === 'Pending');
  const leadsSent = visibleLeads.filter(l => l.status === 'Sent to Site');
  const leadsReferred = visibleLeads.filter(l => l.status === 'Referred');
  const leadsRejected = visibleLeads.filter(l => l.status === 'Rejected');

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div><h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1><p className="text-slate-500">Network Monitor & Patient Pipeline</p></div>
          <Link href="/admin/system" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm relative"><Settings className="h-4 w-4" /> Go to System Ops {pendingResearchers > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce">{pendingResearchers}</span>}</Link>
        </div>

        <div className="flex gap-6 mb-8 border-b border-slate-200">
            <button onClick={() => setActiveTab('claimed')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'claimed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Active Sites (God Mode)</button>
            <button onClick={() => setActiveTab('unclaimed')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'unclaimed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Sales Opportunities <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] ml-1">{unclaimedOpportunities.length}</span></button>
            <button onClick={() => setActiveTab('leads')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'leads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Patient Pipeline ({visibleLeads.length})</button>
        </div>

        {activeTab === 'claimed' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs"><tr><th className="px-6 py-4">Trial Info</th><th className="px-6 py-4">Researcher</th><th className="px-6 py-4">Status Breakdown</th><th className="px-6 py-4">Total</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
                    {claimedTrials.map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4"><div className="font-bold text-slate-900">{claim.trials?.title}</div><div className="text-xs text-slate-500 font-mono mt-1">{claim.nct_id} • {claim.site_location?.city}, {claim.site_location?.state}</div></td>
                            <td className="px-6 py-4"><div className="font-bold text-slate-700">{claim.researcher_profiles?.company_name}</div><div className="text-xs text-slate-500">{claim.researcher_profiles?.full_name}</div><a href={`mailto:${claim.researcher_profiles?.email}`} className="text-xs text-indigo-500 hover:underline">{claim.researcher_profiles?.email}</a></td>
                            {/* NEW BREAKDOWN COLUMN */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
                                    <div className="flex flex-col items-center"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.new}</span><span className="text-slate-400">New</span></div>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <div className="flex flex-col items-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.screening}</span><span className="text-slate-400">Screen</span></div>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <div className="flex flex-col items-center"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.scheduled}</span><span className="text-slate-400">Sched</span></div>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <div className="flex flex-col items-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.enrolled}</span><span className="text-slate-400">Enroll</span></div>
                                </div>
                            </td>
                            <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="text-lg font-bold text-slate-900">{claim.stats.total}</span><span className="text-xs text-slate-400">Leads</span></div></td>
                            <td className="px-6 py-4"><button onClick={() => enterGodMode(claim)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all"><Eye className="h-3 w-3" /> God Mode</button></td>
                        </tr>
                    ))}
                    {claimedTrials.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No claimed trials yet.</td></tr>}
                </tbody></table></div>
            </div>
        )}

        {/* ... UNCLAIMED & LEADS TABS (UNCHANGED) ... */}
        {activeTab === 'unclaimed' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-amber-50/50"><h3 className="font-bold text-amber-900 flex items-center gap-2"><Activity className="h-5 w-5" /> High-Value Opportunities</h3><p className="text-xs text-amber-700 mt-1">These sites have active patient demand but no researcher attached. Call them!</p></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs"><tr><th className="px-6 py-4">Priority</th><th className="px-6 py-4">Trial Site</th><th className="px-6 py-4">Honey Pot</th><th className="px-6 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
                    {unclaimedOpportunities.map((opp) => (
                        <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">{opp.count > 5 ? <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Hot</span> : <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Warm</span>}</td>
                            <td className="px-6 py-4"><div className="font-bold text-slate-900">{opp.title}</div><div className="text-xs text-slate-500 font-mono mt-1">{opp.nct_id}</div><div className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {opp.city}, {opp.state}</div></td>
                            <td className="px-6 py-4"><div className="flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100"><Users className="h-4 w-4 text-emerald-600" /><span className="text-lg font-bold text-emerald-700">{opp.count}</span><span className="text-[10px] font-bold text-emerald-500 uppercase">Patients Waiting</span></div></td>
                            <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-all"><Phone className="h-3 w-3" /> Call Site</button><button onClick={() => markTrialClosed(opp)} className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-100 transition-all" title="Mark as Unresponsive"><Ban className="h-3 w-3" /> Close</button></div></td>
                        </tr>
                    ))}
                    {unclaimedOpportunities.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No unclaimed opportunities.</td></tr>}
                </tbody></table></div>
            </div>
        )}

        {activeTab === 'leads' && (
            <div className="space-y-6">
                {filterNctId && (
                    <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-lg flex items-center justify-between mb-6 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <Filter className="h-5 w-5 text-indigo-300" />
                            <div>
                                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wide">Active Filter</div>
                                <div className="font-bold text-sm">Showing candidates for <span className="font-mono bg-indigo-800 px-2 py-0.5 rounded">{filterNctId}</span></div>
                            </div>
                        </div>
                        <button onClick={clearFilter} className="bg-white text-indigo-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors">Clear Filter</button>
                    </div>
                )}

                <PipelineSection title="To Review" count={leadsToReview.length} color="indigo" isOpen={expandedSections.includes('review')} onToggle={() => toggleSection('review')}>
                    {leadsToReview.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} onDelete={deleteLead} onInvite={() => sendInviteEmail(lead)} />)}
                    {leadsToReview.length === 0 && <div className="text-center py-8 text-slate-400 italic">No new leads.</div>}
                </PipelineSection>
                <PipelineSection title="Pending Info" count={leadsPending.length} color="amber" isOpen={expandedSections.includes('pending')} onToggle={() => toggleSection('pending')}>{leadsPending.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} onDelete={deleteLead} onInvite={() => sendInviteEmail(lead)} />)}</PipelineSection>
                <PipelineSection title="Sent to Site" count={leadsSent.length} color="blue" isOpen={expandedSections.includes('sent')} onToggle={() => toggleSection('sent')}>{leadsSent.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} onDelete={deleteLead} onInvite={() => sendInviteEmail(lead)} />)}</PipelineSection>
                <PipelineSection title="Referred / Completed" count={leadsReferred.length} color="emerald" isOpen={expandedSections.includes('referred')} onToggle={() => toggleSection('referred')}>{leadsReferred.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} onDelete={deleteLead} onInvite={() => sendInviteEmail(lead)} />)}</PipelineSection>
                <div className="pt-4 border-t border-slate-200"><button onClick={() => toggleSection('rejected')} className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600">{expandedSections.includes('rejected') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} View Rejected ({leadsRejected.length})</button>{expandedSections.includes('rejected') && <div className="mt-4 opacity-75">{leadsRejected.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} onDelete={deleteLead} onInvite={() => sendInviteEmail(lead)} />)}</div>}</div>
            </div>
        )}
      </main>

      {/* --- LEAD DETAIL MODAL (UNCHANGED) --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div><h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">Review Candidate</h3>
                <div className="flex flex-wrap gap-4 mt-2 mb-2 text-sm text-slate-600">
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200 font-bold text-slate-800"><User className="h-3.5 w-3.5 text-indigo-500" />{selectedLead.name}</div>
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200"><Mail className="h-3.5 w-3.5 text-indigo-500" />{selectedLead.email}</div>
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200"><Phone className="h-3.5 w-3.5 text-indigo-500" />{selectedLead.phone || "No Phone"}</div>
                   <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded border border-slate-200 text-indigo-700 font-bold"><MapPin className="h-3.5 w-3.5" />{selectedLead.site_city}, {selectedLead.site_state}</div>
                </div>
                <div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-400 uppercase font-bold tracking-wide">Current Stage:</span><select value={selectedLead.status} onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded px-2 py-1 outline-none cursor-pointer"><option value="Strong Lead">New - Strong Lead</option><option value="Unlikely - Review Needed">New - Needs Review</option><option value="Pending">Pending Info</option><option value="Sent to Site">Sent to Site</option><option value="Referred">Referred (Success)</option><option value="Rejected">Rejected</option></select></div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-6 w-6" /></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="w-full lg:w-1/4 bg-yellow-50/30 border-r border-slate-100 flex flex-col">
                <div className="p-4 border-b border-yellow-100/50"><h4 className="text-xs font-bold uppercase text-amber-600 mb-1 flex items-center gap-2"><Lock className="h-3 w-3" /> Admin Private Notes</h4>{savingNote && <span className="text-[10px] text-amber-500 animate-pulse">Saving...</span>}</div>
                <textarea className="flex-1 w-full p-4 bg-transparent border-none outline-none resize-none text-sm text-slate-700" placeholder="Notes log here..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onBlur={saveNoteManual} />
                {selectedLead.is_claimed && (<div className="p-4 border-t border-slate-100 bg-indigo-50/50"><h4 className="text-xs font-bold uppercase text-indigo-500 mb-1 flex items-center gap-2"><Eye className="h-3 w-3" /> Researcher Notes</h4><p className="text-xs text-indigo-900 italic">{selectedLead.researcher_notes || "No notes from site yet."}</p></div>)}
              </div>
              <div className="w-full lg:w-[37.5%] p-6 overflow-y-auto border-r border-slate-100">
                <h4 className="text-xs font-bold uppercase text-indigo-500 mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Patient Answers</h4>
                <div className="space-y-4">{selectedLead.trial_questions?.map((q: any, index: number) => { const userAnswer = selectedLead.answers ? selectedLead.answers[index] : "N/A"; const isCorrect = userAnswer?.toLowerCase() === q.correct_answer?.toLowerCase(); return (<div key={index} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}><p className="text-sm font-bold text-slate-800 mb-2">{index + 1}. {q.question}</p><div className="flex items-center gap-3 text-sm"><span className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 ${isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Answered: {userAnswer}</span>{!isCorrect && <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Wanted: {q.correct_answer}</span>}</div></div>); })}</div>
              </div>
              <div className="w-full lg:w-[37.5%] p-6 overflow-y-auto bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2"><FileText className="h-4 w-4" /> Reference Criteria</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">{selectedLead.trial_criteria}</pre></div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="flex flex-col gap-2 p-3 bg-red-50/50 rounded-xl border border-red-100"><span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Rejection</span><button onClick={() => updateLeadStatus(selectedLead.id, 'Rejected')} className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-center text-xs shadow-sm">Move to Rejected</button></div>
               <div className="flex flex-col gap-2 justify-end"><button onClick={() => setSelectedLead(null)} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 text-center text-xs">Close</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === GOD MODE COMPONENT (FULL RESEARCHER DASHBOARD REPLICA + REALTIME) ===
const GodModeView = ({ claim, onBack }: { claim: any, onBack: () => void }) => {
    const [leads, setLeads] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'leads' | 'profile' | 'media' | 'analytics'>('leads');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'messages' | 'history'>('overview');
    
    // READ ONLY TOGGLE
    const [isReadOnly, setIsReadOnly] = useState(true);
    
    // Content States
    const [customSummary, setCustomSummary] = useState(claim.custom_brief_summary || "");
    const [questions, setQuestions] = useState(claim.custom_screener_questions || claim.trials?.screener_questions || []);
    const [videoUrl, setVideoUrl] = useState(claim.video_url || "");
    const [faqs, setFaqs] = useState(claim.custom_faq || []);
    const [photos, setPhotos] = useState(claim.facility_photos || []);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [noteBuffer, setNoteBuffer] = useState("");
    const [messageInput, setMessageInput] = useState("");
    
    const [isSaving, setIsSaving] = useState(false);
    
    // SCROLL REFS
    const chatBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchGodLeads() {
            const { data } = await supabase
                .from('leads')
                .select('*')
                .eq('trial_id', claim.nct_id)
                .eq('site_city', claim.site_location?.city)
                .eq('site_state', claim.site_location?.state)
                .order('created_at', { ascending: false });
            
            if (data) {
                const leadIds = data.map(l => l.id);
                let counts: any = {};
                if (leadIds.length > 0) {
                    const { data: msgs } = await supabase.from('messages').select('lead_id').eq('is_read', false).eq('sender_role', 'patient').in('lead_id', leadIds);
                    msgs?.forEach(m => { counts[m.lead_id] = (counts[m.lead_id] || 0) + 1; });
                }
                setLeads(data.map(l => ({ ...l, unread_count: counts[l.id] || 0 })));
            }
        }
        fetchGodLeads();
    }, [claim]);

    // === REALTIME LISTENERS (LEADS & MESSAGES) ===
    useEffect(() => {
        // Listener 1: Messages (Chat)
        const msgChannel = supabase
            .channel('god-mode-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.sender_role === 'patient') {
                    if (selectedLeadId !== payload.new.lead_id) {
                        setLeads(prev => prev.map(l => l.id === payload.new.lead_id ? { ...l, unread_count: (l.unread_count || 0) + 1 } : l));
                    } else {
                        setMessages(prev => [...prev, payload.new]);
                        // Mark as read immediately if Admin is viewing
                        if (!isReadOnly) supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
                    }
                }
            })
            .subscribe();

        // Listener 2: Leads (Status Changes)
        const leadChannel = supabase
            .channel('god-mode-leads')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
                // If a lead in our list is updated (e.g. status change by researcher), update local state
                setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
                // Update selected lead details if open
                if (selectedLeadId === payload.new.id) {
                    // Force refresh details? or just let state cascade
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
                // Check if this new lead belongs to this trial/site
                if (payload.new.trial_id === claim.nct_id && payload.new.site_city === claim.site_location?.city) {
                    setLeads(prev => [payload.new, ...prev]);
                }
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(msgChannel); 
            supabase.removeChannel(leadChannel);
        };
    }, [selectedLeadId, claim, isReadOnly]);

    const analyticsData = useMemo(() => {
        const totalLeads = leads.length;
        const enrolled = leads.filter(l => l.site_status === 'Enrolled').length;
        const notEligible = leads.filter(l => l.site_status === 'Not Eligible').length;
        const scheduled = leads.filter(l => l.site_status === 'Scheduled').length;
        const contacting = leads.filter(l => l.site_status === 'Contacted').length;
        const newLeads = leads.filter(l => l.site_status === 'New').length;
        const passRate = totalLeads > 0 ? Math.round(((totalLeads - notEligible) / totalLeads) * 100) : 0;
        
        const dailyCounts = Array(14).fill(0);
        const today = new Date();
        const labels = Array(14).fill("").map((_, i) => { const d = new Date(); d.setDate(today.getDate() - (13 - i)); return d.toLocaleDateString('en-US', { weekday: 'narrow' }); });
        leads.forEach(l => { const diffDays = Math.ceil(Math.abs(today.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)); if (diffDays <= 14) dailyCounts[14 - diffDays]++; });
        const maxDaily = Math.max(...dailyCounts, 5);
        const recentLeadsCount = dailyCounts.slice(7).reduce((a, b) => a + b, 0);

        // Simulation for Funnel Top (Since we don't have page view tracking yet)
        const estimatedViews = Math.round(totalLeads * 18.5); 
        const estimatedStarts = Math.round(totalLeads * 2.5);
        const dropOffRate = estimatedStarts > 0 ? Math.round(((estimatedStarts - totalLeads) / estimatedStarts) * 100) : 0;
        const conversionRate = estimatedViews > 0 ? ((enrolled / estimatedViews) * 100).toFixed(2) : "0.00";

        const failureCounts: Record<string, number> = {};
        leads.forEach(lead => {
            if (Array.isArray(lead.answers) && questions.length > 0) {
                lead.answers.forEach((ans: string, index: number) => {
                    if (questions[index] && ans !== questions[index].correct_answer) {
                        const qText = questions[index].question;
                        failureCounts[qText] = (failureCounts[qText] || 0) + 1;
                    }
                });
            }
        });
        const topFailures = Object.entries(failureCounts).sort(([,a], [,b]) => b - a).slice(0, 4).map(([q, count]) => ({ question: q, count }));

        return { totalLeads, enrolled, scheduled, contacting, newLeads, passRate, recentLeadsCount, topFailures, dailyCounts, labels, maxDaily, estimatedViews, estimatedStarts, dropOffRate, conversionRate };
    }, [leads, questions]);

    useEffect(() => {
        if (!selectedLeadId) return;
        async function loadDrawer() {
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('lead_id', selectedLeadId);
            setHistoryLogs(logs || []);
            const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', selectedLeadId).order('created_at', { ascending: true });
            setMessages(msgs || []);
        }
        loadDrawer();
    }, [selectedLeadId]);

    // SCROLL LOGIC
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, drawerTab]);

    const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        if (isReadOnly) return;
        const { error } = await supabase.from('leads').update({ site_status: newStatus }).eq('id', leadId);
        if(!error) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, site_status: newStatus } : l));
    };

    const saveNote = async () => {
        if (!selectedLeadId || isReadOnly) return;
        await supabase.from('leads').update({ researcher_notes: noteBuffer }).eq('id', selectedLeadId);
        setLeads(prev => prev.map(l => l.id === selectedLeadId ? { ...l, researcher_notes: noteBuffer } : l));
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedLeadId || isReadOnly) return;
        const newMessage = { id: Date.now(), lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher', created_at: new Date().toISOString(), is_read: false };
        setMessages(prev => [...prev, newMessage]); 
        setMessageInput("");
        await supabase.from('messages').insert({ lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher' });
    };

    // --- SAVE EDITS (PROFILE/MEDIA) ---
    const saveSettings = async () => {
        if (isReadOnly) return;
        setIsSaving(true);
        const { error } = await supabase.from('claimed_trials').update({ 
            custom_brief_summary: customSummary, 
            custom_screener_questions: questions, 
            video_url: videoUrl, 
            custom_faq: faqs, 
            facility_photos: photos 
        }).eq('id', claim.id);
        
        if (error) alert("Error saving: " + error.message);
        else alert("Saved changes for researcher!");
        setIsSaving(false);
    };

    // --- TRIGGER DELETE (Added to fix ReferenceError) ---
    const triggerDelete = async () => {
        if (!selectedLeadId || isReadOnly) return;
        if (!confirm("Are you sure you want to delete this lead permanently?")) return;
        
        const { error } = await supabase.from('leads').delete().eq('id', selectedLeadId);
        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            setLeads(prev => prev.filter(l => l.id !== selectedLeadId));
            setSelectedLeadId(null);
        }
    };

    // --- SUB-FUNCTIONS FOR EDITING (Only active when !isReadOnly) ---
    const addQuestion = () => setQuestions([...questions, { question: "", correct_answer: "Yes" }]);
    const removeQuestion = (i: number) => { const n = [...questions]; n.splice(i, 1); setQuestions(n); };
    const updateQuestionText = (i: number, t: string) => { const n = [...questions]; n[i].question = t; setQuestions(n); };
    const toggleAnswer = (i: number) => { const n = [...questions]; n[i].correct_answer = n[i].correct_answer === "Yes" ? "No" : "Yes"; setQuestions(n); };
    const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
    const removeFaq = (i: number) => { const n = [...faqs]; n.splice(i, 1); setFaqs(n); };
    const updateFaq = (i: number, f: string, t: string) => { const n = [...faqs]; (n[i] as any)[f] = t; setFaqs(n); };
    const removePhoto = (url: string) => setPhotos(photos.filter(p => p !== url));

    const selectedLead = leads.find(l => l.id === selectedLeadId);
    const matchScore = selectedLead && claim.trials?.screener_questions ? { count: claim.trials.screener_questions.reduce((acc: number, q: any, i: number) => acc + (selectedLead.answers?.[i] === q.correct_answer ? 1 : 0), 0), total: claim.trials.screener_questions.length } : { count: 0, total: 0 };
    const missedCount = matchScore.total - matchScore.count;
    const formatTime = (dateStr: string) => { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

    const StatusColumn = ({ status, label, icon: Icon, colorClass }: any) => {
        const columnLeads = leads.filter(l => {
            if (status === 'Not Eligible') return (l.site_status === 'Not Eligible' || l.site_status === 'Withdrawn') && l.name.toLowerCase().includes(searchTerm.toLowerCase());
            return (l.site_status || 'New') === status && l.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
        return (
            <div className="flex-shrink-0 w-80 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
                <div className={`p-3 border-b border-slate-200 flex items-center justify-between ${colorClass} bg-opacity-10`}>
                    <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} /><h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">{label}</h3></div>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-slate-500 shadow-sm">{columnLeads.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {columnLeads.map(lead => (
                        <div key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setNoteBuffer(lead.researcher_notes || ""); setDrawerTab('overview'); }} className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${selectedLeadId === lead.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>{lead.status?.includes('Strong') && <Crown className="h-3 w-3 text-amber-500" />}</div>
                            <div className="text-xs text-slate-500 mb-3 line-clamp-1">{lead.email}</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>{lead.unread_count > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{lead.unread_count} Unread</span>}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans overflow-hidden">
            <div className="bg-indigo-900 text-white h-16 shrink-0 flex items-center justify-between px-6 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></button>
                    <div><h2 className="font-bold text-sm">God Mode: {claim.trials?.title}</h2><div className="text-xs text-indigo-300">{claim.researcher_profiles?.company_name} • {claim.site_location?.city}, {claim.site_location?.state}</div></div>
                </div>
                
                {/* READ ONLY TOGGLE */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsReadOnly(!isReadOnly)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isReadOnly ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                        {isReadOnly ? <Lock className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                        {isReadOnly ? "Read Only" : "Editing Mode"}
                    </button>
                    <div className="h-6 w-px bg-white/20"></div>
                    <div className="flex bg-indigo-800/50 p-1 rounded-lg">
                        {['leads','analytics','profile','media'].map((t: any) => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${activeTab === t ? 'bg-white text-indigo-900' : 'text-indigo-200 hover:text-white'}`}>{t}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {activeTab === 'leads' && (
                    <>
                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
                                <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                            </div>
                            <div className="flex-1 overflow-x-auto p-6"><div className="flex h-full gap-6">
                                <StatusColumn status="New" label="New" icon={Users} colorClass="bg-blue-500" />
                                <StatusColumn status="Contacted" label="Screening" icon={Phone} colorClass="bg-amber-500" />
                                <StatusColumn status="Scheduled" label="Scheduled" icon={Calendar} colorClass="bg-purple-500" />
                                <StatusColumn status="Enrolled" label="Enrolled" icon={CheckCircle2} colorClass="bg-emerald-500" />
                                <StatusColumn status="Not Eligible" label="Archived" icon={Archive} colorClass="bg-slate-500" />
                            </div></div>
                        </div>
                        {selectedLead && (
                            <div className="w-[600px] border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-20">
                                <div className="h-16 border-b px-6 flex items-center justify-between">
                                    <div><h2 className="font-bold text-lg">{selectedLead.name}</h2><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ID: {String(selectedLead.id).slice(0,8)}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${selectedLead.status?.includes('Strong') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selectedLead.status || 'Standard'}</span></div></div>
                                    <button onClick={() => setSelectedLeadId(null)}><X className="h-5 w-5" /></button>
                                </div>
                                <div className="flex border-b border-slate-200 px-6">
                                    <button onClick={() => setDrawerTab('overview')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList className="h-4 w-4" /> Overview</button>
                                    <button onClick={() => setDrawerTab('messages')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'messages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                        <MessageSquare className="h-4 w-4" /> Messages
                                        {selectedLead.unread_count > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{selectedLead.unread_count}</span>}
                                    </button>
                                    <button onClick={() => setDrawerTab('history')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${drawerTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><History className="h-4 w-4" /> History</button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                                    {drawerTab === 'overview' && (
                                        <div className="space-y-6">
                                            <div><h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Contact Details</h3><div className="grid grid-cols-2 gap-4"><div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group bg-white shadow-sm"><div className="flex items-center gap-3 overflow-hidden"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Mail className="h-4 w-4" /></div><div className="text-xs font-bold text-slate-700 truncate">{selectedLead.email}</div></div><a href={`mailto:${selectedLead.email}`} className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 shrink-0">EMAIL</a></div><div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group bg-white shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><Phone className="h-4 w-4" /></div><div className="text-xs font-bold text-slate-700">{selectedLead.phone}</div></div><a href={`tel:${selectedLead.phone}`} className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 shrink-0">CALL</a></div></div></div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline Status</div><div className="relative w-48"><select className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-900 font-bold text-sm rounded-lg py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm" value={selectedLead.site_status || 'New'} onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)} disabled={isReadOnly}><option value="New">New Applicant</option><option value="Contacted">Contacted / Screening</option><option value="Scheduled">Scheduled Visit</option><option value="Enrolled">Enrolled</option><option value="Not Eligible">Not Eligible</option><option value="Withdrawn">Withdrawn</option></select><ChevronDown className="absolute right-3 top-3 h-3 w-3 text-slate-400 pointer-events-none" /></div></div>
                                            
                                            {/* CLINICAL NOTES SECTION */}
                                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-64">
                                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                                    <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Clinical Notes</h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-slate-400 italic">Auto-save on blur</span>
                                                        <button onClick={saveNote} disabled={isReadOnly} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 disabled:opacity-50"><Save className="h-3 w-3" /> Save</button>
                                                    </div>
                                                </div>
                                                <textarea className="flex-1 w-full p-4 text-sm text-slate-800 outline-none resize-none font-medium leading-relaxed" placeholder="Enter clinical observations, call logs, or screening notes here..." value={noteBuffer} onChange={(e) => setNoteBuffer(e.target.value)} onBlur={saveNote} disabled={isReadOnly} />
                                            </div>

                                            {/* SCREENER RESPONSES & HISTORY */}
                                            <div>
                                                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Screener Responses & History</h3>
                                                {missedCount > 0 && <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3"><AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /><div><h4 className="text-sm font-bold text-amber-800">Criteria Mismatch</h4><p className="text-xs text-amber-700 mt-1 leading-relaxed">This patient missed <strong>{missedCount} criteria</strong>. Please contact the patient to verify if their responses are accurate before scheduling.</p></div></div>}
                                                
                                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                        <div className="flex items-center gap-2"><FileText className="h-3 w-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Questionnaire Data</span></div>
                                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${matchScore.count === matchScore.total ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}><Calculator className="h-3 w-3" />{matchScore.count}/{matchScore.total} Criteria Met</div>
                                                    </div>
                                                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                                        {claim.trials?.screener_questions?.map((q: any, i: number) => { 
                                                            const ans = selectedLead.answers && selectedLead.answers[i]; 
                                                            const isMatch = ans === q.correct_answer; 
                                                            return ( 
                                                                <div key={i} className={`p-4 rounded-xl border ${isMatch ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                                                                    <p className="text-sm text-slate-800 font-medium mb-3 leading-relaxed">{q.question}</p>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Patient Answer:</span><span className={`text-xs font-bold px-3 py-1 rounded-md border ${isMatch ? 'text-emerald-700 bg-white border-emerald-200 shadow-sm' : 'text-red-700 bg-white border-red-200 shadow-sm'}`}>{ans || "N/A"}</span></div>
                                                                        {!isMatch && (<div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Required:</span><span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded">{q.correct_answer}</span></div>)}
                                                                    </div>
                                                                </div> 
                                                            ); 
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {drawerTab === 'messages' && (
                                        <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                                                {messages.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No messages yet.</div>}
                                                {messages.map((msg, i) => (
                                                    <div key={i} className={`flex ${msg.sender_role === 'researcher' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender_role === 'researcher' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}>
                                                            <div>{msg.content}</div>
                                                            <div className="text-[10px] text-indigo-200 mt-1 flex items-center justify-end gap-1">
                                                                {formatTime(msg.created_at)}
                                                                {msg.sender_role === 'researcher' && (
                                                                    <span>{msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={chatBottomRef} />
                                            </div>
                                            <div className="p-3 bg-white border-t border-slate-100 flex gap-2"><input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type a secure message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} disabled={isReadOnly} /><button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50" disabled={isReadOnly}><Send className="h-4 w-4" /></button></div>
                                        </div>
                                    )}
                                    {drawerTab === 'history' && (
                                        <div className="space-y-6">
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /> Audit Log</h3><div className="space-y-6 relative pl-2"><div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-100"></div>{historyLogs.map((log: any, i: number) => { const isAppReceived = log.action === 'Application Received'; return ( <div key={i} className="relative flex gap-4 animate-in slide-in-from-left-2"><div className={`w-3 h-3 rounded-full ring-4 ring-white z-10 shrink-0 mt-1.5 ${isAppReceived ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div><div><div className="text-xs font-bold text-slate-900">{log.action}</div><div className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()} by {log.performed_by}</div><div className="text-xs text-slate-600 mt-1">{log.detail}</div></div></div> ); })}</div></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center"><span className="text-[10px] text-slate-400">Lead ID: {selectedLead.id}</span>{isReadOnly ? <span className="text-xs text-slate-400 italic">Read Only Mode</span> : <button onClick={triggerDelete} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3" /> Delete</button>}</div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'analytics' && (
                    <div className="flex-1 p-8 bg-slate-50 h-full overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Eye className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Est.</span></div><div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedViews.toLocaleString()}</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Page Views</p></div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><MousePointer2 className="h-5 w-5" /></div></div><div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.conversionRate}%</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Visit-to-Enrolled</p></div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Percent className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{analyticsData.dropOffRate}% Drop-off</span></div><div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedStarts.toLocaleString()}</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Started Screener</p></div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><DollarSign className="h-5 w-5" /></div></div><div className="text-3xl font-extrabold text-slate-900 mt-2">$0.00</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Cost Per Randomization</p></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-8"><h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-600" /> Pipeline</h3></div>
                                <div className="space-y-6 relative">
                                    <div className="flex items-center group"><div className="w-24 text-xs font-bold text-slate-500 text-right pr-4">New</div><div className="flex-1 h-10 bg-slate-50 rounded-r-lg flex items-center px-4 relative"><div className="absolute left-0 top-0 bottom-0 bg-blue-100 rounded-r-lg transition-all duration-1000" style={{ width: '100%' }}></div><span className="relative z-10 font-bold text-blue-900 text-sm">{analyticsData.totalLeads}</span></div></div>
                                    <div className="flex items-center group"><div className="w-24 text-xs font-bold text-slate-500 text-right pr-4">Enrolled</div><div className="flex-1 h-10 bg-slate-50 rounded-r-lg flex items-center px-4 relative"><div className="absolute left-0 top-0 bottom-0 bg-emerald-100 rounded-r-lg transition-all duration-1000" style={{ width: analyticsData.totalLeads ? `${(analyticsData.enrolled / analyticsData.totalLeads) * 100}%` : '0%' }}></div><span className="relative z-10 font-bold text-emerald-900 text-sm">{analyticsData.enrolled}</span></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(activeTab === 'profile' || activeTab === 'media') && (
                    <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
                        {isReadOnly && <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6 flex items-center gap-3 text-amber-800 text-sm font-bold sticky top-0 z-50"><Lock className="h-4 w-4" /> Editing Locked. Toggle "Editing Mode" to make changes.</div>}
                        <div className={`max-w-4xl mx-auto space-y-8 pb-20 ${isReadOnly ? 'opacity-80 pointer-events-none' : ''}`}>
                            {activeTab === 'profile' ? (
                                <>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6"><h3 className="font-bold text-slate-900 mb-4">Study Overview</h3><textarea className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Enter patient-friendly description..." /></div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-900">Screener Questions</h3><button onClick={addQuestion} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{questions.map((q, idx) => (<div key={idx} className="flex gap-4 items-center group"><div className="flex-1"><input type="text" value={q.question} onChange={(e) => updateQuestionText(idx, e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Question..." /></div><button onClick={() => toggleAnswer(idx)} className={`w-24 py-3 rounded-lg text-xs font-bold border ${q.correct_answer === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{q.correct_answer}</button><button onClick={() => removeQuestion(idx)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div>))}</div></div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start gap-4 mb-6"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Video className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Intro Video</h3></div></div><input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste link..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Q&A</h3></div></div><button onClick={addFaq} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{faqs.map((f, idx) => (<div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group"><button onClick={() => removeFaq(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button><input type="text" value={f.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-transparent border-b border-slate-200 pb-2 mb-2 text-sm font-bold text-slate-900 outline-none" /><textarea value={f.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none" rows={2} /></div>))}</div></div>
                                </>
                            )}
                            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">{isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}</button></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};