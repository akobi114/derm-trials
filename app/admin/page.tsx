"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, X, Trash2 } from "lucide-react";

// Utilities & Components
// Path FIX: Use "./utils" because utils.ts is in the same folder as this page
import { calculateTier, isSameLocation, getContactStrategy } from "./utils";

// Path FIX: All these components are now inside the admin/components folder
import LeadFeed from "./components/LeadFeed";
import SiteOpportunities from "./components/SiteOpportunities";
import ActiveSitesTable from "./components/ActiveSitesTable";
import GodModeView from "./components/GodModeView";

const ADMIN_EMAIL = "akobic14@gmail.com";

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const [loading, setLoading] = useState(true);
  
  // Navigation & Deep Linking
  const activeTab = (searchParams.get('tab') as any) || 'lead_feed';
  const [viewingClaim, setViewingClaim] = useState<any>(null); 

  // Data States
  const [leads, setLeads] = useState<any[]>([]); 
  const [activeSites, setActiveSites] = useState<any[]>([]); 
  const [siteOpportunities, setSiteOpportunities] = useState<any[]>([]); 
  const [pendingResearchers, setPendingResearchers] = useState(0);

  // UI States
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [savingSiteNote, setSavingSiteNote] = useState<string | null>(null); 

  // --- 1. SECURITY & INIT ---
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if (user.email !== ADMIN_EMAIL) { router.push('/'); return; }
      await loadDashboardData();
      setLoading(false);
    }
    checkUser();
  }, [router]);

  // --- 2. DATA AGGREGATION ENGINE ---
  async function loadDashboardData() {
      const { data: claims } = await supabase.from('claimed_trials').select(`*, trials (title, screener_questions), researcher_profiles (*)`).eq('status', 'approved');
      const { data: rawLeads } = await supabase.from('leads').select(`*, trials (*)`).order('created_at', { ascending: false });
      const { data: siteNotes } = await supabase.from('admin_site_notes').select('*');

      if (!rawLeads) return;

      // Process Active Sites
      const sites = (claims || []).map((claim: any) => {
          const leadStatuses = rawLeads.filter((l: any) => l.trial_id === claim.nct_id && isSameLocation(l, claim.site_location));
          return { ...claim, stats: { total: leadStatuses.length, new: leadStatuses.filter((l: any) => l.site_status === 'New').length, screening: leadStatuses.filter((l: any) => l.site_status === 'Contacted').length, scheduled: leadStatuses.filter((l: any) => l.site_status === 'Scheduled').length, enrolled: leadStatuses.filter((l: any) => l.site_status === 'Enrolled').length } };
      });
      setActiveSites(sites.sort((a, b) => b.stats.total - a.stats.total));

      // Process Leads
      const enrichedLeads = rawLeads.map((lead: any) => {
          const matchingClaim = sites.find((c: any) => c.nct_id === lead.trial_id && isSameLocation(lead, c.site_location));
          return { ...lead, trial_title: lead.trials?.title, trial_questions: lead.trials?.screener_questions, trial_criteria: lead.trials?.inclusion_criteria, trial_locations: lead.trials?.locations, trial_central: lead.trials?.central_contact, is_claimed: !!matchingClaim, researcher: matchingClaim ? matchingClaim.researcher_profiles : null };
      });
      setLeads(enrichedLeads);

      // Process Opportunities
      const opportunities: any = {};
      enrichedLeads.filter((l: any) => !l.is_claimed && ['New', 'Strong Lead', 'Unlikely - Review Needed'].includes(l.status)).forEach(lead => {
          const siteUid = lead.location_id || `${lead.site_city}-${lead.site_state}`;
          const key = `${lead.trial_id}-${siteUid}`;
          if (!opportunities[key]) {
              const existingNote = siteNotes?.find((n: any) => n.nct_id === lead.trial_id && isSameLocation(lead, n));
              opportunities[key] = { id: key, nct_id: lead.trial_id, location_id: lead.location_id, title: lead.trials?.title, city: lead.site_city, state: lead.site_state, facility: lead.site_facility, count: 0, admin_note: existingNote?.notes || "", site_location: { city: lead.site_city, state: lead.site_state, facility: lead.site_facility, id: lead.location_id } };
          }
          opportunities[key].count++;
      });
      setSiteOpportunities(Object.values(opportunities).sort((a: any, b: any) => b.count - a.count));

      const { count } = await supabase.from('researcher_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false);
      if (count !== null) setPendingResearchers(count);
  }

  // --- 3. URL DEEP LINK SYNC ---
  useEffect(() => {
      if (!loading) {
          const claimIdFromUrl = searchParams.get('claim_id');
          if (claimIdFromUrl) {
              const target = activeSites.find((c: any) => c.id === claimIdFromUrl) || siteOpportunities.find((o: any) => o.id === claimIdFromUrl);
              if (target) setViewingClaim(target);
          }
      }
  }, [loading, activeSites, siteOpportunities, searchParams]);

  // --- 4. LOGIC HANDLERS ---
  const updateLeadNote = async (leadId: string, text: string) => {
      setSavingNote(leadId); 
      await supabase.from('leads').update({ admin_notes: text }).eq('id', leadId);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, admin_notes: text } : l));
      setSavingNote(null);
  };

  const updateSiteNote = async (oppId: string, nctId: string, city: string, state: string, text: string) => {
      setSavingSiteNote(oppId);
      await supabase.from('admin_site_notes').upsert({ nct_id: nctId, city, state, notes: text }, { onConflict: 'nct_id, city, state' });
      setSiteOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, admin_note: text } : o));
      setSavingSiteNote(null);
  };

  const generateEmailDraft = (lead: any, specificContact?: any) => {
      const strategy = getContactStrategy(lead);
      const contact = specificContact || strategy.localContacts[0] || strategy.central || { name: "Coordinator" };
      const tier = calculateTier(lead, lead.trial_questions);
      const body = `Hi ${contact.name || "Coordinator"},\n\nI have a pre-screened patient for your study in ${lead.site_city}.\n\nCandidate: ${lead.name}\nStatus: ${tier?.label || 'Verified Match'}\n\nClaim your account to contact them: [Link]\n\nBest,\nAdmin Team`;
      navigator.clipboard.writeText(body);
      alert("Draft copied!");
  };

  const deleteLead = async () => {
      if (!selectedLead || !confirm("Delete lead?")) return;
      await supabase.from('leads').delete().eq('id', selectedLead.id);
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
  };

  // God Mode Toggles
  const enterGodMode = (claim: any) => { setViewingClaim(claim); const url = new URL(window.location.href); url.searchParams.set('claim_id', claim.id); url.searchParams.set('tab', activeTab); window.history.pushState({}, '', url.toString()); };
  const exitGodMode = () => { setViewingClaim(null); const url = new URL(window.location.href); url.searchParams.delete('claim_id'); window.history.pushState({}, '', url.toString()); };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (viewingClaim) return <GodModeView claim={viewingClaim} onBack={exitGodMode} />;

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab.replace('_', ' ')}</h1>
            <p className="text-slate-500 font-medium">Real-time network oversight and lead management.</p>
        </div>

        {activeTab === 'lead_feed' && (
          <LeadFeed 
            leads={leads} 
            onViewLead={setSelectedLead} 
            onUpdateNote={updateLeadNote} 
            generateEmailDraft={generateEmailDraft} 
            savingNote={savingNote} 
          />
        )}
        
        {activeTab === 'site_opportunities' && (
          <SiteOpportunities 
            opportunities={siteOpportunities} 
            onEnterGodMode={enterGodMode} 
            onUpdateSiteNote={updateSiteNote} 
            savingSiteNote={savingSiteNote} 
          />
        )}
        
        {activeTab === 'active_sites' && (
          <ActiveSitesTable 
            activeSites={activeSites} 
            onEnterGodMode={enterGodMode} 
          />
        )}

        {/* PERSISTENT LEAD DRAWER */}
        {selectedLead && (
            <div className="fixed inset-0 z-[100] flex justify-end">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
                <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                        <div>
                          <h2 className="font-bold text-xl">{selectedLead.name}</h2>
                          <p className="text-xs text-slate-500">{selectedLead.trial_title}</p>
                        </div>
                        <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Patient Answers</h3>
                                {selectedLead.trial_questions?.map((q: any, i: number) => (
                                    <div key={i} className="mb-4 pb-4 border-b border-slate-100 last:border-0">
                                        <p className="text-sm font-bold text-slate-800 mb-1">{q.question}</p>
                                        <p className="text-sm text-indigo-600 font-mono">{selectedLead.answers?.[i] || "No Answer"}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={deleteLead} className="w-full py-3 text-red-600 font-bold border border-red-100 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2">
                              <Trash2 size={16}/> Delete Lead Record
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}