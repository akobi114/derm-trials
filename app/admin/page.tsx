"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react"; // Added Suspense
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
  Calendar, Archive, Save, UploadCloud, PieChart,
  Gem, Medal, Shield, PenSquare, Info, Copy, ExternalLink, Stethoscope,
  MoreHorizontal, Globe
} from "lucide-react";

// 🔒 SECURITY
const ADMIN_EMAIL = "akobic14@gmail.com"; 

// --- TYPES & HELPERS ---
type LeadStatus = 'New' | 'Contacted' | 'Scheduled' | 'Enrolled' | 'Not Eligible' | 'Withdrawn';
type TierType = 'diamond' | 'gold' | 'silver' | 'mismatch';

// --- SHARED TIER LOGIC ---
const calculateTier = (lead: any, questions: any[]) => {
    if (!questions || questions.length === 0) return null;
    let correct = 0;
    let wrong = 0;
    let unsure = 0;
    const total = questions.length;

    questions.forEach((q: any, i: number) => {
        const ans = lead.answers && lead.answers[i];
        if (ans === q.correct_answer) {
             correct++;
        } else if (ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"))) {
             unsure++;
        } else {
             wrong++;
        }
    });

    const mismatchRate = wrong / total;
    let tier: { label: string, icon: any, style: string, type: TierType };

    if (wrong === 0 && unsure === 0) tier = { label: "Perfect Match", icon: Gem, style: "bg-emerald-50 text-emerald-700 border-emerald-100", type: 'diamond' };
    else if (wrong === 0) tier = { label: "Likely Match", icon: Medal, style: "bg-amber-50 text-amber-700 border-amber-100", type: 'gold' };
    else if (mismatchRate <= 0.20) tier = { label: "Needs Review", icon: Shield, style: "bg-slate-100 text-slate-600 border-slate-200", type: 'silver' };
    else tier = { label: "Mismatch", icon: AlertCircle, style: "bg-rose-50 text-rose-700 border-rose-100", type: 'mismatch' };

    const detail = `(${correct}/${total} Met${unsure > 0 ? `, ${unsure} Unsure` : ''}${wrong > 0 ? `, ${wrong} Missed` : ''})`;
    return { ...tier, detail };
};

// --- FUZZY MATCHER ---
const isSameLocation = (leadCity: string, leadState: string, claimCity: string, claimState: string) => {
    const clean = (str: string) => (str || "").toLowerCase().trim().replace(/[^a-z]/g, "");
    const lCity = clean(leadCity);
    const cCity = clean(claimCity);
    if (lCity && cCity && lCity === cCity) return true;
    return false;
};

// Renamed to Content component for Suspense wrapping
function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const [loading, setLoading] = useState(true);
   
  // --- TABS & NAVIGATION ---
  const [activeTab, setActiveTab] = useState<'lead_feed' | 'site_opportunities' | 'active_sites'>('lead_feed');
   
  // --- GOD MODE STATE ---
  const [viewingClaim, setViewingClaim] = useState<any>(null); 

  // --- DATA STATES ---
  const [leads, setLeads] = useState<any[]>([]); 
  const [activeSites, setActiveSites] = useState<any[]>([]); 
  const [siteOpportunities, setSiteOpportunities] = useState<any[]>([]); 
   
  // --- FILTER STATE ---
  const [filterNctId, setFilterNctId] = useState<string | null>(null);

  // --- LEAD DETAIL STATE ---
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [savingSiteNote, setSavingSiteNote] = useState<string | null>(null); 
  const [pendingResearchers, setPendingResearchers] = useState(0);

  // --- 1. SECURITY & INIT ---
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if (user.email !== ADMIN_EMAIL) {
        console.warn("Unauthorized access attempt by:", user.email);
        router.push('/'); return;
      }
       
      await loadDashboardData();
      setLoading(false);
    }
    checkUser();
  }, [router]);

  // --- 2. UNIFIED DATA FETCHING ---
  async function loadDashboardData() {
      // A. Fetch Claims
      const { data: claims } = await supabase
        .from('claimed_trials')
        .select(`*, trials (title, screener_questions), researcher_profiles (company_name, full_name, email, phone_number)`)
        .eq('status', 'approved');

      // B. Fetch Leads (Includes Central Contact)
      const { data: rawLeads } = await supabase
        .from('leads')
        .select(`*, trials (title, nct_id, screener_questions, inclusion_criteria, locations, central_contact)`) 
        .order('created_at', { ascending: false });

      // C. Fetch Site Notes
      const { data: siteNotes } = await supabase.from('admin_site_notes').select('*');

      if (!rawLeads) return;

      // D. Process Active Sites
      const sites = (claims || []).map((claim: any) => {
          const leadStatuses = rawLeads.filter((l: any) => 
              l.trial_id === claim.nct_id && 
              isSameLocation(l.site_city, l.site_state, claim.site_location?.city, claim.site_location?.state)
          );
          
          return {
              ...claim,
              stats: {
                  total: leadStatuses.length,
                  new: leadStatuses.filter((l: any) => l.site_status === 'New').length,
                  screening: leadStatuses.filter((l: any) => l.site_status === 'Contacted').length,
                  scheduled: leadStatuses.filter((l: any) => l.site_status === 'Scheduled').length,
                  enrolled: leadStatuses.filter((l: any) => l.site_status === 'Enrolled').length
              }
          };
      });
      setActiveSites(sites.sort((a: any, b: any) => b.stats.total - a.stats.total));

      // E. Process Leads
      const enrichedLeads = rawLeads.map((lead: any) => {
          const matchingClaim = sites.find((c: any) => 
              c.nct_id === lead.trial_id && 
              isSameLocation(lead.site_city, lead.site_state, c.site_location?.city, c.site_location?.state)
          );

          return { 
              ...lead, 
              trial_title: lead.trials?.title, 
              trial_questions: lead.trials?.screener_questions, 
              trial_criteria: lead.trials?.inclusion_criteria, 
              trial_locations: lead.trials?.locations,
              trial_central: lead.trials?.central_contact, 
              is_claimed: !!matchingClaim, 
              researcher: matchingClaim ? matchingClaim.researcher_profiles : null 
          };
      });
      setLeads(enrichedLeads);

      // F. Process Opportunities
      const opportunities: any = {};
      const unclaimedLeads = enrichedLeads.filter((l: any) => !l.is_claimed && ['New', 'Strong Lead', 'Unlikely - Review Needed'].includes(l.status));
      
      for (const lead of unclaimedLeads) {
          const key = `${lead.trial_id}-${lead.site_city}-${lead.site_state}`;
          if (!opportunities[key]) {
              // Find existing note for this site
              const existingNote = siteNotes?.find((n: any) => 
                  n.nct_id === lead.trial_id && 
                  isSameLocation(lead.site_city, lead.site_state, n.city, n.state)
              );

              opportunities[key] = { 
                  id: key, 
                  nct_id: lead.trial_id, 
                  title: lead.trials?.title, 
                  city: lead.site_city, 
                  state: lead.site_state, 
                  count: 0,
                  leads: [], 
                  admin_note: existingNote?.notes || "", 
                  trials: lead.trials, 
                  site_location: { city: lead.site_city, state: lead.site_state },
                  researcher_profiles: { company_name: "Unclaimed Site" }
              };
          }
          opportunities[key].count++;
          opportunities[key].leads.push(lead);
      }
      setSiteOpportunities(Object.values(opportunities).sort((a: any, b: any) => b.count - a.count));

      // G. Pending Count
      const { count } = await supabase.from('researcher_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false);
      if (count !== null) setPendingResearchers(count);
  }

  // --- URL SYNC ---
  useEffect(() => {
      if (!loading && activeSites.length > 0) {
          const claimIdFromUrl = searchParams.get('claim_id');
          if (claimIdFromUrl) {
              const claimToView = activeSites.find((c: any) => c.id === claimIdFromUrl);
              if (claimToView) setViewingClaim(claimToView);
          }
      }
  }, [loading, activeSites, searchParams]);

  // --- GOD MODE HANDLERS ---
  const enterGodMode = (claim: any) => {
      setViewingClaim(claim);
      if (claim.id !== 'virtual') {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('claim_id', claim.id);
          window.history.pushState({}, '', newUrl.toString());
      }
  };

  const exitGodMode = () => {
      setViewingClaim(null);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('claim_id');
      window.history.pushState({}, '', newUrl.toString());
  };

  // --- CONTACT STRATEGY ---
  const getContactStrategy = (lead: any) => {
      let location = null;
      if (lead.trial_locations) {
          location = lead.trial_locations.find((l: any) => isSameLocation(lead.site_city, lead.site_state, l.city, l.state));
      }

      const localContacts = [
          ...(location?.location_contacts || []),
          ...(location?.investigators || [])
      ];
      const facility = location?.facility;
      const fullAddress = location ? `${location.city}, ${location.state} ${location.zip || ''}` : null;
      const central = lead.trial_central;

      let bestType = 'none';
      let bestData = null;

      if (localContacts.length > 0) {
          bestType = 'local';
          bestData = localContacts[0];
      } else if (facility) {
          bestType = 'facility';
          bestData = facility;
      } else if (central) {
          bestType = 'central';
          bestData = central;
      }

      return { location, localContacts, facility, fullAddress, central, bestType, bestData };
  };

  const generateEmailDraft = (lead: any, specificContact?: any) => {
      const strategy = getContactStrategy(lead);
      const contact = specificContact || strategy.localContacts[0] || strategy.central || { name: "Coordinator" };
      const contactName = contact.name || "Coordinator";
      const tier = calculateTier(lead, lead.trial_questions);
      
      const body = `Hi ${contactName},\n\nI have a pre-screened patient candidate for your study in ${lead.site_city}.\n\nCandidate: ${lead.name}\nStatus: ${tier?.label || 'Verified Match'}\n\nWe are holding this lead in our secure portal. Please claim your free account on DermTrials to view their full details and contact them directly:\n\n[Link to Claim Account]\n\nBest,\nAdmin Team`;
      
      navigator.clipboard.writeText(body);
      alert("Email draft copied to clipboard!");
  };

  // --- LIVE NOTE UPDATING (LEADS) ---
  const updateLeadNote = async (leadId: string, text: string) => {
      setSavingNote(leadId); 
      await supabase.from('leads').update({ admin_notes: text }).eq('id', leadId);
      setLeads((current: any[]) => current.map((l: any) => l.id === leadId ? { ...l, admin_notes: text } : l));
      setSavingNote(null);
  };

  // --- LIVE NOTE UPDATING (SITES) ---
  const updateSiteNote = async (oppId: string, nctId: string, city: string, state: string, text: string) => {
      setSavingSiteNote(oppId);
      
      await supabase.from('admin_site_notes').upsert({ 
          nct_id: nctId, 
          city: city, 
          state: state, 
          notes: text 
      }, { onConflict: 'nct_id, city, state' });

      setSiteOpportunities((current: any[]) => current.map((o: any) => o.id === oppId ? { ...o, admin_note: text } : o));
      setSavingSiteNote(null);
  };

  // --- MANUAL SAVE FOR DRAWER ---
  const saveNoteManual = async () => { 
      if (!selectedLead) return; 
      setSavingNote(selectedLead.id); 
      await supabase.from('leads').update({ admin_notes: noteText }).eq('id', selectedLead.id); 
      setLeads((l: any[]) => l.map((x: any) => x.id === selectedLead.id ? { ...x, admin_notes: noteText } : x)); 
      setSavingNote(null); 
  };

  // --- RENDER ---
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  if (viewingClaim) {
      return <GodModeView claim={viewingClaim} onBack={exitGodMode} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div><h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1><p className="text-slate-500">Network Monitor & Patient Pipeline</p></div>
          <Link href="/admin/system" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm relative"><Settings className="h-4 w-4" /> Go to System Ops {pendingResearchers > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce">{pendingResearchers}</span>}</Link>
        </div>

        <div className="flex gap-6 mb-8 border-b border-slate-200">
            <button onClick={() => setActiveTab('lead_feed')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'lead_feed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Mail className="h-4 w-4" /> Lead Feed (Outreach)</button>
            <button onClick={() => setActiveTab('site_opportunities')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'site_opportunities' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Site Opportunities <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] ml-1">{siteOpportunities.length}</span></button>
            <button onClick={() => setActiveTab('active_sites')} className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'active_sites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Active Sites</button>
        </div>

        {/* TAB 1: LEAD FEED (HIGH DENSITY OPS VIEW) */}
        {activeTab === 'lead_feed' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Mail className="h-5 w-5 text-indigo-600" /> Outreach Queue</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{leads.filter((l: any) => !l.is_claimed).length} Pending</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {leads.filter((l: any) => !l.is_claimed).map((lead: any) => {
                        const tier = calculateTier(lead, lead.trial_questions);
                        const strategy = getContactStrategy(lead);
                        
                        return (
                            <div key={lead.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-6 group relative">
                                
                                {/* COL 1: PATIENT & TRIAL (30%) */}
                                <div className="w-full md:w-[30%] space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 text-sm cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }}>{lead.name}</h4>
                                            {/* RESTORED DETAIL NEXT TO BADGE */}
                                            {tier && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${tier.style}`}>{tier.label}</span>
                                                    <span className="text-[10px] text-slate-400 italic">{tier.detail}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="font-medium text-slate-700">{lead.trial_title}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 w-fit rounded border border-slate-200">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{lead.site_city}, {lead.site_state}</span>
                                    </div>
                                    <button onClick={() => { setSelectedLead(lead); setNoteText(lead.admin_notes || ""); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                        View Application <ChevronRight className="h-3 w-3" />
                                    </button>
                                </div>

                                {/* COL 2: CONTACT DOSSIER (35%) */}
                                <div className="w-full md:w-[35%] bg-slate-50/50 rounded-lg border border-slate-200 p-3">
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-1"><Building2 className="h-3 w-3" /> Site Contact Data</h5>
                                    
                                    {/* Facility Name */}
                                    {strategy.facility && (
                                        <div className="mb-2">
                                            <div className="text-xs font-bold text-slate-800">{strategy.facility}</div>
                                            {strategy.fullAddress && <div className="text-[10px] text-slate-500">{strategy.fullAddress}</div>}
                                        </div>
                                    )}

                                    {/* Local Contacts Loop */}
                                    {strategy.localContacts.length > 0 ? (
                                        <div className="space-y-2 mb-2">
                                            {strategy.localContacts.map((contact: any, i: number) => (
                                                <div key={i} className="flex justify-between items-start text-xs border-l-2 border-indigo-300 pl-2">
                                                    <div className="w-full">
                                                        <div className="font-bold text-slate-700">{contact.name || "Unknown Name"}</div>
                                                        {contact.phone && <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 text-indigo-400"/> {contact.phone}</div>}
                                                        {contact.email && <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3 text-indigo-400"/> {contact.email}</div>}
                                                        {!contact.phone && !contact.email && <div className="text-[10px] text-slate-400 italic">No direct info</div>}
                                                    </div>
                                                    {contact.email && (
                                                        <button onClick={() => generateEmailDraft(lead, contact)} className="p-1 hover:bg-indigo-100 rounded text-indigo-600" title="Copy Email">
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic mb-2">No direct contacts found.</div>
                                    )}

                                    {/* Central Fallback */}
                                    {strategy.central && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">Backup:</div>
                                            <div className="text-xs text-slate-600 font-bold">{strategy.central.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{strategy.central.phone}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{strategy.central.email}</div>
                                        </div>
                                    )}
                                </div>

                                {/* COL 3: OPS & NOTES (35%) */}
                                <div className="w-full md:w-[35%] flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Admin Log</span>
                                        {savingNote === lead.id && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Saving...</span>}
                                    </div>
                                    <textarea 
                                        defaultValue={lead.admin_notes || ""} 
                                        onBlur={(e) => updateLeadNote(lead.id, e.target.value)}
                                        className="flex-1 w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none resize-none min-h-[80px]"
                                        placeholder="Log outreach notes here..."
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${lead.admin_notes ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                            {lead.admin_notes ? "In Progress" : "New Lead"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {leads.filter((l: any) => !l.is_claimed).length === 0 && <div className="p-10 text-center text-slate-400 italic">No pending leads.</div>}
                </div>
            </div>
        )}

        {/* TAB 2: SITE OPPORTUNITIES (NOW WITH CONTACTS & PERSISTENT NOTES) */}
        {activeTab === 'site_opportunities' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2"><Activity className="h-5 w-5" /> Sales Targets</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">{siteOpportunities.length} Unclaimed Sites</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {siteOpportunities.map((opp: any) => {
                        const representativeLead = opp.leads[0];
                        const strategy = getContactStrategy(representativeLead);
                        
                        return (
                            <div key={opp.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-6 group relative">
                                
                                {/* COL 1: SITE INFO & VALUE */}
                                <div className="w-full md:w-[30%] space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 text-sm">{opp.title}</h4>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">{opp.nct_id}</div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 w-fit rounded border border-slate-200">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{opp.city}, {opp.state}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                                        <Users className="h-4 w-4 text-emerald-600" />
                                        <span className="text-lg font-bold text-emerald-700">{opp.count} Leads Waiting</span>
                                    </div>
                                </div>

                                {/* COL 2: CONTACT DOSSIER (Same as Lead Feed) */}
                                <div className="w-full md:w-[35%] bg-slate-50/50 rounded-lg border border-slate-200 p-3">
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-1"><Building2 className="h-3 w-3" /> Target Contact</h5>
                                    
                                    {strategy.facility && (
                                        <div className="mb-2">
                                            <div className="text-xs font-bold text-slate-800">{strategy.facility}</div>
                                            {strategy.fullAddress && <div className="text-[10px] text-slate-500">{strategy.fullAddress}</div>}
                                        </div>
                                    )}

                                    {strategy.localContacts.length > 0 ? (
                                        <div className="space-y-2 mb-2">
                                            {strategy.localContacts.map((contact: any, i: number) => (
                                                <div key={i} className="flex justify-between items-start text-xs border-l-2 border-indigo-300 pl-2">
                                                    <div className="w-full">
                                                        <div className="font-bold text-slate-700">{contact.name || "Unknown Name"}</div>
                                                        {contact.phone && <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 text-indigo-400"/> {contact.phone}</div>}
                                                        {contact.email && <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3 text-indigo-400"/> {contact.email}</div>}
                                                        {!contact.phone && !contact.email && <div className="text-[10px] text-slate-400 italic">No direct info</div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic mb-2">No direct contacts found.</div>
                                    )}

                                    {/* Central Fallback (NOW INCLUDED IN SITE OPPS) */}
                                    {strategy.central && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">Backup:</div>
                                            <div className="text-xs text-slate-600 font-bold">{strategy.central.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{strategy.central.phone}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{strategy.central.email}</div>
                                        </div>
                                    )}
                                </div>

                                {/* COL 3: ACTIONS & PERSISTENT LOG */}
                                <div className="w-full md:w-[35%] flex flex-col h-full justify-between">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Site Outreach Log</span>
                                            {savingSiteNote === opp.id && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Saving...</span>}
                                        </div>
                                        <textarea 
                                            defaultValue={opp.admin_note || ""} 
                                            onBlur={(e) => updateSiteNote(opp.id, opp.nct_id, opp.city, opp.state, e.target.value)}
                                            className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none resize-none min-h-[60px]"
                                            placeholder="Log notes about this site..."
                                        />
                                    </div>
                                    <button onClick={() => enterGodMode({ ...opp, id: 'virtual' })} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                                        <Eye className="h-3 w-3" /> Manage All {opp.count} Leads
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {siteOpportunities.length === 0 && <div className="p-10 text-center text-slate-400 italic">No unclaimed opportunities.</div>}
                </div>
            </div>
        )}

        {/* TAB 3: ACTIVE SITES */}
        {activeTab === 'active_sites' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs"><tr><th className="px-6 py-4">Trial Info</th><th className="px-6 py-4">Researcher</th><th className="px-6 py-4">Status Breakdown</th><th className="px-6 py-4">Total</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
                    {activeSites.map((claim: any) => (
                        <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4"><div className="font-bold text-slate-900">{claim.trials?.title}</div><div className="text-xs text-slate-500 font-mono mt-1">{claim.nct_id} • {claim.site_location?.city}, {claim.site_location?.state}</div></td>
                            <td className="px-6 py-4"><div className="font-bold text-slate-700">{claim.researcher_profiles?.company_name}</div><div className="text-xs text-slate-500">{claim.researcher_profiles?.full_name}</div></td>
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
                    {activeSites.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No claimed trials yet.</td></tr>}
                </tbody></table></div>
            </div>
        )}
      </main>

      {/* --- LEAD DETAIL DRAWER (Still available if they click "View Application") --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
          <div className="relative h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{selectedLead.name.charAt(0)}</div>
                    <div>
                        <h2 className="font-bold text-slate-900 text-lg leading-tight">{selectedLead.name}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono text-slate-400">{selectedLead.trial_id}</span>
                            <span className="text-slate-300">|</span>
                            <MapPin className="h-3 w-3" /> {selectedLead.site_city}, {selectedLead.site_state}
                        </div>
                    </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="h-6 w-6" /></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[55%] border-r border-slate-200 overflow-y-auto p-8 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileText className="h-4 w-4" /> Application Data</h3>
                        {(() => {
                            const tier = calculateTier(selectedLead, selectedLead.trial_questions);
                            return tier ? (
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${tier.style}`}>{tier.label}</span>
                                    <span className="text-[10px] text-slate-400 italic">{tier.detail}</span>
                                </div>
                            ) : null;
                        })()}
                    </div>
                    
                    <div className="space-y-4 mb-8">
                        {selectedLead.trial_questions?.map((q: any, i: number) => {
                            const ans = selectedLead.answers ? selectedLead.answers[i] : "N/A";
                            const isUnsure = ans?.toLowerCase().includes("know") || ans?.toLowerCase().includes("unsure");
                            return (
                                <div key={i} className={`p-4 rounded-xl border transition-all ${isUnsure ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-sm font-bold text-slate-800 mb-2 leading-snug">{q.question}</p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isUnsure ? 'bg-white text-amber-700 border border-amber-100' : 'bg-white border border-slate-200 text-slate-700'}`}>{ans}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Contact Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700 font-medium">{selectedLead.email}</span></div>
                            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700 font-medium">{selectedLead.phone}</span></div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: THE OUTREACH CENTER */}
                <div className="w-[45%] overflow-y-auto p-8 bg-slate-50/50">
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" /> Outreach Targets</h3>
                        {(() => {
                            const strategy = getContactStrategy(selectedLead);
                            
                            if (strategy.facility || strategy.localContacts.length > 0) {
                                return (
                                    <div className="space-y-4">
                                        {/* Primary Facility Card */}
                                        <div className="bg-white p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm relative">
                                            <div className="absolute top-2 right-2 text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Local Site</div>
                                            
                                            {/* Facility Header */}
                                            <div className="mb-4 pb-4 border-b border-slate-100">
                                                <h4 className="font-bold text-slate-900 text-sm mb-1">{strategy.facility || "Facility Name Not Listed"}</h4>
                                                {strategy.fullAddress && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <MapPin className="h-3 w-3 text-slate-400" /> {strategy.fullAddress}
                                                    </div>
                                                )}
                                            </div>

                                            {/* People List */}
                                            {strategy.localContacts.length > 0 ? (
                                                <div className="space-y-3">
                                                    {strategy.localContacts.map((contact: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                            <div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{contact.role || "Contact"}</div>
                                                                <div className="text-sm font-bold text-slate-700">{contact.name || "Unknown Name"}</div>
                                                                <div className="text-xs text-slate-500 mt-1 font-mono">{contact.phone || contact.email || "No direct info"}</div>
                                                            </div>
                                                            {contact.email && (
                                                                <button onClick={() => generateEmailDraft(selectedLead, contact)} className="p-1.5 bg-white text-indigo-600 border border-slate-200 rounded hover:bg-indigo-50 transition-colors" title="Copy Email">
                                                                    <Copy className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-2">
                                                    <div className="text-xs text-slate-400 italic mb-3">No specific contacts listed.</div>
                                                    <a 
                                                        href={`https://www.google.com/search?q=${encodeURIComponent(strategy.facility + ' ' + selectedLead.site_city + ' ' + selectedLead.site_state + ' phone number')}`} 
                                                        target="_blank" 
                                                        className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all"
                                                    >
                                                        <Globe className="h-3 w-3" /> Find {strategy.facility} on Google
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Central Backup (Only show if it exists) */}
                                        {strategy.central && (
                                            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200/60 relative opacity-80 hover:opacity-100 transition-opacity">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Backup: Central Hotline</div>
                                                <div className="text-sm font-bold text-slate-700">{strategy.central.name}</div>
                                                <div className="grid grid-cols-1 gap-1 text-xs mt-2 font-mono text-slate-500">
                                                    <div>{strategy.central.phone}</div>
                                                    <div>{strategy.central.email}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // FALLBACK: Central Only
                            if (strategy.central) {
                                return (
                                    <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm relative">
                                        <div className="absolute top-2 right-2 text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">Central Only</div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-2">{strategy.central.name}</h4>
                                        <div className="text-xs text-slate-500 mb-4">No local site contact found. Call central recruitment.</div>
                                        <div className="space-y-2 text-xs font-mono text-slate-600">
                                            {strategy.central.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {strategy.central.phone}</div>}
                                            {strategy.central.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {strategy.central.email}</div>}
                                        </div>
                                    </div>
                                );
                            }

                            return <div className="text-xs text-slate-400 italic">No contact info found for this site.</div>;
                        })()}
                    </div>

                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Admin Outreach Log</h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-48 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                            <textarea className="flex-1 w-full p-4 text-xs text-slate-700 outline-none resize-none bg-transparent leading-relaxed" placeholder="Log your calls, emails, or voicemail details here..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onBlur={saveNoteManual} />
                            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center"><span className="text-[10px] text-slate-400 font-medium">{savingNote ? "Saving..." : "Auto-saves on blur"}</span></div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <button onClick={() => { 
                            setViewingClaim({ id: 'virtual', nct_id: selectedLead.trial_id, site_location: { city: selectedLead.site_city, state: selectedLead.site_state } }); 
                            setSelectedLead(null); 
                        }} className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <LayoutDashboard className="h-4 w-4" /> View Full Trial Pipeline
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper to provide Suspense context to the AdminDashboard
export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}

// === GOD MODE COMPONENT (Complete) ===
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
    const [tierFilter, setTierFilter] = useState<'all' | TierType>('all');
    const [messages, setMessages] = useState<any[]>([]);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [noteBuffer, setNoteBuffer] = useState("");
    const [messageInput, setMessageInput] = useState("");
    
    // Question Editing State
    const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
    const [tempAnswer, setTempAnswer] = useState("");
    
    const [isSaving, setIsSaving] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    // --- ANALYTICS CALCULATIONS ---
    const analyticsData = useMemo(() => {
        const totalLeads = leads.length;
        const enrolled = leads.filter((l: any) => l.site_status === 'Enrolled').length;
        const notEligible = leads.filter((l: any) => l.site_status === 'Not Eligible').length;
        const scheduled = leads.filter((l: any) => l.site_status === 'Scheduled').length;
        const estimatedViews = Math.round(totalLeads * 18.5); 
        const estimatedStarts = Math.round(totalLeads * 2.5);
        const dropOffRate = estimatedStarts > 0 ? Math.round(((estimatedStarts - totalLeads) / estimatedStarts) * 100) : 0;
        const conversionRate = estimatedViews > 0 ? ((enrolled / estimatedViews) * 100).toFixed(2) : "0.00";
        const passRate = totalLeads > 0 ? Math.round(((totalLeads - notEligible) / totalLeads) * 100) : 0;
        const failureCounts: Record<string, number> = {};
        leads.forEach((lead: any) => {
            if (Array.isArray(lead.answers) && questions.length > 0) {
                lead.answers.forEach((ans: string, index: number) => {
                    if (questions[index] && ans !== questions[index].correct_answer) {
                        const qText = questions[index].question;
                        failureCounts[qText] = (failureCounts[qText] || 0) + 1;
                    }
                });
            }
        });
        const topFailures = Object.entries(failureCounts).sort(([,a]: any, [,b]: any) => b - a).slice(0, 4).map(([q, count]: any) => ({ question: q, count }));
        return { totalLeads, enrolled, scheduled, notEligible, estimatedViews, estimatedStarts, dropOffRate, conversionRate, passRate, topFailures };
    }, [leads, questions]);

    useEffect(() => {
        async function fetchGodLeads() {
            const { data } = await supabase.from('leads').select('*').eq('trial_id', claim.nct_id).eq('site_city', claim.site_location?.city).eq('site_state', claim.site_location?.state).order('created_at', { ascending: false });
            if (data) {
                const leadIds = data.map((l: any) => l.id);
                let counts: any = {};
                if (leadIds.length > 0) {
                    const { data: msgs } = await supabase.from('messages').select('lead_id').eq('is_read', false).eq('sender_role', 'patient').in('lead_id', leadIds);
                    msgs?.forEach((m: any) => { counts[m.lead_id] = (counts[m.lead_id] || 0) + 1; });
                }
                setLeads(data.map((l: any) => ({ ...l, unread_count: counts[l.id] || 0 })));
            }
        }
        fetchGodLeads();
    }, [claim]);

    // === REALTIME LISTENERS ===
    useEffect(() => {
        const msgChannel = supabase.channel('god-mode-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
            if (payload.new.sender_role === 'patient') {
                if (selectedLeadId !== payload.new.lead_id) {
                    setLeads((prev: any[]) => prev.map((l: any) => l.id === payload.new.lead_id ? { ...l, unread_count: (l.unread_count || 0) + 1 } : l));
                } else {
                    setMessages((prev: any[]) => [...prev, payload.new]);
                    if (!isReadOnly) supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
                }
            }
        }).subscribe();
        const leadChannel = supabase.channel('god-mode-leads').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload: any) => {
            setLeads((prev: any[]) => prev.map((l: any) => l.id === payload.new.id ? { ...l, ...payload.new } : l));
        }).subscribe();
        return () => { supabase.removeChannel(msgChannel); supabase.removeChannel(leadChannel); };
    }, [selectedLeadId, claim, isReadOnly]);

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

    useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, drawerTab]);

    const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        if (isReadOnly) return;
        const { error } = await supabase.from('leads').update({ site_status: newStatus }).eq('id', leadId);
        if(!error) setLeads((prev: any[]) => prev.map((l: any) => l.id === leadId ? { ...l, site_status: newStatus } : l));
    };

    // --- FIX: ANSWER NORMALIZATION ---
    const options = ["Yes", "No", "I don't know"];
    const normalizeAnswer = (val: string) => {
        if (!val) return "Yes"; 
        const match = options.find(o => o.toLowerCase() === val.toLowerCase());
        return match || "Yes"; 
    };

    const updateLeadAnswer = async (index: number, newAnswer: string) => {
        if (!selectedLead || isReadOnly) return;
        
        const newAnswers = questions.map((_: string, i: number) => {
            if (i === index) return newAnswer;
            if (selectedLead.answers && selectedLead.answers[i] !== undefined) return selectedLead.answers[i];
            return null; 
        });

        setLeads((prev: any[]) => prev.map((l: any) => l.id === selectedLead.id ? { ...l, answers: newAnswers } : l));
        setEditingAnswerIndex(null);

        const { error } = await supabase.from('leads').update({ answers: newAnswers }).eq('id', selectedLead.id);
        
        if (error) {
            alert(`Save Failed: ${error.message}. Check Admin RLS Policies.`);
            setLeads((prev: any[]) => prev.map((l: any) => l.id === selectedLead.id ? { ...l, answers: selectedLead.answers } : l));
        } else {
            await supabase.from('audit_logs').insert({ lead_id: selectedLead.id, action: "Data Correction (Admin)", detail: `Updated Q${index + 1} to "${newAnswer}"`, performed_by: 'Admin' });
        }
    };

    const saveNote = async () => {
        if (!selectedLeadId || isReadOnly) return;
        await supabase.from('leads').update({ researcher_notes: noteBuffer }).eq('id', selectedLeadId);
        setLeads((prev: any[]) => prev.map((l: any) => l.id === selectedLeadId ? { ...l, researcher_notes: noteBuffer } : l));
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedLeadId || isReadOnly) return;
        const newMessage = { id: Date.now(), lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher', created_at: new Date().toISOString(), is_read: false };
        setMessages((prev: any[]) => [...prev, newMessage]); 
        setMessageInput("");
        const { error } = await supabase.from('messages').insert({ lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher' });
        if (error) alert("Message failed to send: " + error.message);
    };

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

    const triggerDelete = async () => {
        if (!selectedLeadId || isReadOnly) return;
        if (!confirm("Are you sure you want to delete this lead permanently?")) return;
        const { error } = await supabase.from('leads').delete().eq('id', selectedLeadId);
        if (error) { alert("Error deleting: " + error.message); } 
        else {
            setLeads((prev: any[]) => prev.filter((l: any) => l.id !== selectedLeadId));
            setSelectedLeadId(null);
        }
    };

    // --- SUB-FUNCTIONS FOR EDITING ---
    const addQuestion = () => setQuestions([...questions, { question: "", correct_answer: "Yes" }]);
    const removeQuestion = (i: number) => { const n = [...questions]; n.splice(i, 1); setQuestions(n); };
    const updateQuestionText = (i: number, t: string) => { const n = [...questions]; n[i].question = t; setQuestions(n); };
    const toggleAnswer = (i: number) => { const n = [...questions]; n[i].correct_answer = n[i].correct_answer === "Yes" ? "No" : "Yes"; setQuestions(n); };
    const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
    const removeFaq = (i: number) => { const n = [...faqs]; n.splice(i, 1); setFaqs(n); };
    const updateFaq = (i: number, f: string, t: string) => { const n = [...faqs]; (n[i] as any)[f] = t; setFaqs(n); };
    const removePhoto = (url: string) => setPhotos(photos.filter((p: string) => p !== url));

    // --- SHARED TIER CALCULATION USAGE ---
    const selectedLead = leads.find((l: any) => l.id === selectedLeadId);
    
    // Match Score with Unsure logic
    const calculateMatchScore = () => {
        if (!selectedLead || !questions || questions.length === 0) return { count: 0, unsure: 0, total: 0, wrong: 0 };
        const total = questions.length;
        let count = 0; let unsure = 0; let wrong = 0;
        questions.forEach((q: any, i: number) => {
            const ans = selectedLead.answers && selectedLead.answers[i];
            if (ans === q.correct_answer) count++;
            else if (ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"))) unsure++;
            else wrong++;
        });
        return { count, unsure, wrong, total };
    };
    const matchScore = calculateMatchScore();
    const formatTime = (dateStr: string) => { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

    const StatusColumn = ({ status, label, icon: Icon, colorClass }: any) => {
        const columnLeads = leads.filter((l: any) => {
            const matchesStatus = status === 'Not Eligible' ? (l.site_status === 'Not Eligible' || l.site_status === 'Withdrawn') : (l.site_status || 'New') === status;
            const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
            const tier = calculateTier(l, questions); // <--- FIXED: USES GLOBAL FUNCTION
            const matchesTier = tierFilter === 'all' || tier?.type === tierFilter;
            return matchesStatus && matchesSearch && matchesTier;
        });
        return (
            <div className="flex-shrink-0 w-80 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
                <div className={`p-3 border-b border-slate-200 flex items-center justify-between ${colorClass} bg-opacity-10`}>
                    <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} /><h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">{label}</h3></div>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-slate-500 shadow-sm">{columnLeads.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {columnLeads.map((lead: any) => {
                        const tier = calculateTier(lead, questions); // <--- FIXED
                        const TierIcon = tier?.icon || HelpCircle;
                        return (
                            <div key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setNoteBuffer(lead.researcher_notes || ""); setDrawerTab('overview'); }} className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md group ${selectedLeadId === lead.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'} relative`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                                    {tier && (<div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${tier.style}`}><TierIcon className="h-3 w-3" />{tier.label}</div>)}
                                </div>
                                {/* NEW: Stats Detail in God Mode Card */}
                                {tier && <div className="text-[9px] text-slate-400 italic mb-2">{tier.detail}</div>}
                                <div className="text-xs text-slate-500 mb-3 line-clamp-1">{lead.email}</div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>{lead.unread_count > 0 && <span className="absolute bottom-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md z-10 animate-in zoom-in">{lead.unread_count} Unread</span>}</div>
                            </div>
                        );
                    })}
                    {columnLeads.length === 0 && <div className="text-center py-10 opacity-30 text-xs font-bold text-slate-400 uppercase">No Candidates</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* --- GOD MODE HEADER --- */}
            <div className="bg-indigo-900 text-white h-16 shrink-0 flex items-center justify-between px-6 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></button>
                    <div><h2 className="font-bold text-sm">God Mode: {claim.trials?.title}</h2><div className="text-xs text-indigo-300">{claim.researcher_profiles?.company_name} • {claim.site_location?.city}, {claim.site_location?.state}</div></div>
                </div>
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
                            <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0">
                                <div className="relative w-64 mr-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                                {/* NEW: TIER FILTERS */}
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-2 flex items-center gap-1"><Filter className="h-3 w-3" /> Filter:</span>
                                    {[{ id: 'all', label: 'All', icon: Users, color: 'text-slate-600' }, { id: 'diamond', label: 'Perfect', icon: Gem, color: 'text-emerald-600' }, { id: 'gold', label: 'Likely', icon: Medal, color: 'text-amber-600' }, { id: 'silver', label: 'Review', icon: Shield, color: 'text-slate-600' }, { id: 'mismatch', label: 'Mismatch', icon: AlertCircle, color: 'text-rose-600' }].map((f: any) => (
                                        <button key={f.id} onClick={() => setTierFilter(f.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tierFilter === f.id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><f.icon className={`h-3 w-3 ${tierFilter === f.id ? f.color : ''}`} />{f.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-x-auto p-6"><div className="flex h-full gap-6"><StatusColumn status="New" label="New" icon={Users} colorClass="bg-blue-500" /><StatusColumn status="Contacted" label="Screening" icon={Phone} colorClass="bg-amber-500" /><StatusColumn status="Scheduled" label="Scheduled" icon={Calendar} colorClass="bg-purple-500" /><StatusColumn status="Enrolled" label="Enrolled" icon={CheckCircle2} colorClass="bg-emerald-500" /><StatusColumn status="Not Eligible" label="Archived" icon={Archive} colorClass="bg-slate-500" /></div></div>
                        </div>
                        {selectedLead && (
                            <div className="w-[600px] border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-20">
                                <div className="h-16 border-b px-6 flex items-center justify-between bg-slate-50/50">
                                    <div><h2 className="font-bold text-lg">{selectedLead.name}</h2><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ID: {String(selectedLead.id).slice(0,8)}</span>{(() => { const tier = calculateTier(selectedLead, questions); const TierIcon = tier?.icon || HelpCircle; return tier ? (<div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${tier.style}`}><TierIcon className="h-3 w-3" />{tier.label}</div>) : null; })()}</div></div>
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
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline Status</div><div className="relative w-48"><select className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-900 font-bold text-sm rounded-lg py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm" value={selectedLead.site_status || 'New'} onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)} disabled={isReadOnly}><option value="New">New Applicant</option><option value="Contacted">Contacted / Screening</option><option value="Scheduled">Scheduled Visit</option><option value="Enrolled">Enrolled</option><option value="Not Eligible">Not Eligible</option><option value="Withdrawn">Withdrawn</option></select><ChevronDown className="absolute right-3 top-3 h-3 w-3 text-slate-400 pointer-events-none" /></div></div>
                                            
                                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-64">
                                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center"><h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Clinical Notes</h3><div className="flex items-center gap-3"><span className="text-[10px] text-slate-400 italic">Auto-save on blur</span><button onClick={saveNote} disabled={isReadOnly} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 disabled:opacity-50"><Save className="h-3 w-3" /> Save</button></div></div>
                                                <textarea className="flex-1 w-full p-4 text-sm text-slate-800 outline-none resize-none font-medium leading-relaxed" placeholder="Enter clinical observations, call logs, or screening notes here..." value={noteBuffer} onChange={(e) => setNoteBuffer(e.target.value)} onBlur={saveNote} disabled={isReadOnly} />
                                            </div>

                                            {/* EDUCATIONAL ALERTS */}
                                            {matchScore.wrong > 0 ? (
                                                <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                                                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-bold text-amber-800">Criteria Mismatch ({matchScore.wrong} Missed)</h4>
                                                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">This patient answered incorrectly. Often this is a mistake. Call to verify.<br/><br/><strong>💡 Pro Tip:</strong> If they clarify their answer about a question on the call, update their answer to "Yes" or "No" by clicking the <strong>Pencil Icon <PenSquare className="inline h-3 w-3" /></strong> below. Correcting the answer will automatically update their Tier score.</p>
                                                    </div>
                                                </div>
                                            ) : matchScore.unsure > 0 ? (
                                                <div className="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                                                    <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-bold text-indigo-800">Clarification Needed ({matchScore.unsure} Unsure)</h4>
                                                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">This candidate is a strong match but needs clarification on a few points.<br/><br/><strong>💡 Pro Tip:</strong> If they clarify their answer about a question on the call, update "I don't know" to "Yes" or "No" by clicking the <strong>Pencil Icon <PenSquare className="inline h-3 w-3" /></strong> below. Correcting the answer will automatically update their Tier score.</p>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="h-3 w-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Questionnaire Data</span></div><div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${matchScore.count === matchScore.total ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}><Calculator className="h-3 w-3" />{matchScore.count}/{matchScore.total} Met {matchScore.unsure > 0 && <span className="ml-1 text-amber-600">({matchScore.unsure} Unsure)</span>}</div></div>
                                                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                                    {questions.map((q: any, i: number) => { 
                                                        const ans = selectedLead.answers && selectedLead.answers[i]; 
                                                        const isMatch = ans === q.correct_answer; 
                                                        const isUnsure = ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"));
                                                        const isEditing = editingAnswerIndex === i;
                                                        let cardClass = isMatch ? 'bg-slate-50 border-slate-200' : isUnsure ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';
                                                        let badgeClass = isMatch ? 'text-emerald-700 bg-white border-emerald-200 shadow-sm' : isUnsure ? 'text-orange-700 bg-white border-orange-200 shadow-sm' : 'text-red-700 bg-white border-red-200 shadow-sm';

                                                        return ( 
                                                            <div key={i} className={`p-4 rounded-xl border ${cardClass} relative group/card`}>
                                                                <p className="text-sm text-slate-800 font-medium mb-3 pr-8">{q.question}</p>
                                                                {isEditing && !isReadOnly ? (
                                                                    <div className="flex items-center gap-2 animate-in fade-in"><select className="flex-1 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={tempAnswer} onChange={(e) => setTempAnswer(e.target.value)}><option value="Yes">Yes</option><option value="No">No</option><option value="I don't know">I don't know</option></select><button onClick={() => updateLeadAnswer(i, tempAnswer)} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-indigo-700">Save</button><button onClick={() => setEditingAnswerIndex(null)} className="text-slate-400 hover:text-slate-600 px-2">Cancel</button></div>
                                                                ) : (
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase">Patient Answer:</span><span className={`text-xs font-bold px-3 py-1 rounded-md border ${badgeClass}`}>{ans || "N/A"}</span>{!isReadOnly && <button onClick={() => { setEditingAnswerIndex(i); setTempAnswer(normalizeAnswer(ans)); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all opacity-0 group-hover/card:opacity-100" title="Correct this answer"><PenSquare className="h-3 w-3" /></button>}</div>
                                                                        {!isMatch && <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold uppercase">Required:</span><span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded">{q.correct_answer}</span></div>}
                                                                    </div>
                                                                )}
                                                            </div> 
                                                        ); 
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {drawerTab === 'messages' && (
                                        <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                            <div ref={chatBottomRef} className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                                                {messages.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No messages yet.</div>}
                                                {messages.map((msg: any, i: number) => (
                                                    <div key={i} className={`flex ${msg.sender_role === 'researcher' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender_role === 'researcher' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}><div>{msg.content}</div><div className="text-[10px] text-indigo-200 mt-1 flex items-center justify-end gap-1">{formatTime(msg.created_at)} {msg.sender_role === 'researcher' && (<span>{msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>)}</div></div></div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-white border-t border-slate-100 flex gap-2"><input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type a secure message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} disabled={isReadOnly} /><button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50" disabled={isReadOnly}><Send className="h-4 w-4" /></button></div>
                                        </div>
                                    )}
                                    {drawerTab === 'history' && (
                                        <div className="space-y-6"><div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /> Audit Log</h3><div className="space-y-6 relative pl-2"><div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-100"></div>{historyLogs.map((log: any, i: number) => { const isAppReceived = log.action === 'Application Received'; return ( <div key={i} className="relative flex gap-4 animate-in slide-in-from-left-2"><div className={`w-3 h-3 rounded-full ring-4 ring-white z-10 shrink-0 mt-1.5 ${isAppReceived ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div><div><div className="text-xs font-bold text-slate-900">{log.action}</div><div className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()} by {log.performed_by}</div><div className="text-xs text-slate-600 mt-1">{log.detail}</div></div></div> ); })}</div></div></div>
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
                        <div className="max-w-4xl mx-auto space-y-8 pb-20 relative">
                            {isReadOnly && <div className="bg-slate-800 text-white p-4 rounded-xl mb-6 flex items-center gap-3"><Lock className="h-5 w-5" /> <div><strong>Read Only Mode.</strong> Enable Editing Mode at the top to make changes.</div></div>}
                            <div className={isReadOnly ? 'opacity-75 pointer-events-none' : ''}>
                                {activeTab === 'profile' ? (
                                    <>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6"><h3 className="font-bold text-slate-900 mb-4">Study Overview</h3><textarea className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Enter patient-friendly description..." /></div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-900">Screener Questions</h3><button onClick={addQuestion} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{questions.map((q: any, idx: number) => (<div key={idx} className="flex gap-4 items-center group"><div className="flex-1"><input type="text" value={q.question} onChange={(e) => updateQuestionText(idx, e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Question..." /></div><button onClick={() => toggleAnswer(idx)} className={`w-24 py-3 rounded-lg text-xs font-bold border ${q.correct_answer === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{q.correct_answer}</button><button onClick={() => removeQuestion(idx)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div>))}</div></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-start gap-4 mb-6"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Video className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Intro Video</h3></div></div><input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste link..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Q&A</h3></div></div><button onClick={addFaq} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100">+ Add Question</button></div><div className="space-y-4">{faqs.map((f: any, idx: number) => (<div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group"><button onClick={() => removeFaq(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button><input type="text" value={f.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-transparent border-b border-slate-200 pb-2 mb-2 text-sm font-bold text-slate-900 outline-none" /><textarea value={f.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none" rows={2} /></div>))}</div></div>
                                    </>
                                )}
                                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-40 flex justify-end px-10 shadow-lg"><button onClick={saveSettings} disabled={isReadOnly || isSaving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};