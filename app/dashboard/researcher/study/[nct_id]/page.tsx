"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ArrowLeft, Users, MapPin, Mail, Phone, Lock, 
  CheckCircle2, Image as ImageIcon, Save, Trash2, Check, X, 
  Video, MessageSquare, UploadCloud, Trophy, TrendingUp, 
  Crown, Lightbulb, ChevronDown, Calendar, Clock, FileText, 
  LayoutDashboard, ClipboardList, ShieldAlert, Filter, Search,
  MoreHorizontal, UserCheck, XCircle, ArrowRight, Calculator, 
  AlertTriangle, AlertCircle, Send, History, BarChart3, PieChart,
  Activity, MousePointerClick, FileEdit, Archive, CheckCheck,
  Eye, MousePointer2, Percent, DollarSign, HelpCircle,
  Gem, Medal, Shield, PenSquare, Info, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

// --- CONFIGURATION ---
const SHOW_ANALYTICS_LIVE = true; 

// --- TYPES ---
type LeadStatus = 'New' | 'Contacted' | 'Scheduled' | 'Enrolled' | 'Not Eligible' | 'Withdrawn';
type TierType = 'diamond' | 'gold' | 'silver' | 'mismatch';

// --- HELPER COMPONENTS ---
const LockedOverlay = ({ title, desc }: { title: string, desc: string }) => (
  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-sm mx-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Lock className="h-8 w-8" /></div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{desc}</p>
          <Link href="/dashboard/researcher/billing" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">View Upgrade Options</Link>
      </div>
  </div>
);

// --- STRICT MATCHER (UPDATED) ---
const isMatch = (lead: any, claimLocation: any) => {
    if (!claimLocation) return false;

    // 1. PRIMARY MATCH: Unique Database ID (UUID)
    // Ensures for example Scottsdale vs Gilbert isolation even with missing facility names.
    // We check both .id and .location_id to handle different JSON cache structures.
    const claimId = claimLocation.id || claimLocation.location_id;
    if (lead.location_id && claimId && lead.location_id === claimId) {
        return true;
    }

    // 2. STRICT FACILITY MATCH (Fallback logic for legacy data)
    if (lead.site_facility && claimLocation.facility) {
        return lead.site_facility.trim().toLowerCase() === claimLocation.facility.trim().toLowerCase();
    }

    // 3. CITY MATCH (Last resort fallback logic for legacy data)
    const clean = (str: string) => (str || "").toLowerCase().trim().replace(/[^a-z]/g, "");
    const lCity = clean(lead.site_city);
    const cCity = clean(claimLocation.city);
    
    // Strict City Match
    if (lCity && cCity && lCity === cCity) return true;

    return false;
};

export default function StudyManager() {
  const params = useParams(); 
  const router = useRouter();
  
  // --- STATE ---
  const [user, setUser] = useState<any>(null); 
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  const [trial, setTrial] = useState<any>(null);
  const [claim, setClaim] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isOrgVerified, setIsOrgVerified] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'leads' | 'profile' | 'media' | 'analytics'>('leads'); 
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Content Editing State
  const [customSummary, setCustomSummary] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // CRM / Board State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [noteBuffer, setNoteBuffer] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<'all' | TierType>('all'); 
  
  // Drawer Internal State
  const [drawerTab, setDrawerTab] = useState<'overview' | 'messages' | 'history'>('overview');
  const [messageInput, setMessageInput] = useState("");
  const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]); 
  
  // Question Editing State (Resolve Unsure)
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
  const [tempAnswer, setTempAnswer] = useState("");

  // Modals & UI
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Scroll Ref for Chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- TAB HANDLING (UPDATED) ---
  const handleTabChange = (tab: 'leads' | 'profile' | 'media' | 'analytics') => {
    setActiveTab(tab);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    
    // UPDATE 1: Persist the claim_id so we don't lose the specific site context
    const currentParams = new URLSearchParams(window.location.search);
    const claimId = currentParams.get('claim_id');
    if (claimId) newUrl.searchParams.set('claim_id', claimId);

    window.history.pushState({}, '', newUrl.toString());
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'profile' || tabParam === 'leads' || tabParam === 'media' || tabParam === 'analytics') {
      setActiveTab(tabParam as any);
    }

async function fetchData() {
      console.log("🔍 [Researcher] Loading Shared Site Pipeline...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // --- TASK 1: METADATA BADGE INTEGRATION ---
      const badgeRole = user.app_metadata?.role;
      const isPlatformBoss = badgeRole === 'super_admin';
      setIsSuperAdmin(isPlatformBoss);

      // --- ORG RESOLUTION: Check both profiles and team members ---
      const { data: profData } = await supabase.from('researcher_profiles').select('*, organizations(*)').eq('user_id', user.id).maybeSingle();
      const { data: teamData } = await supabase.from('team_members').select('*, organizations(*)').eq('user_id', user.id).maybeSingle();

      const activeProfile = profData || teamData;
      const org = profData?.organizations || teamData?.organizations;

      // --- TASK 2: PLATFORM MASTER BYPASS (REDIRECT BYPASS) ---
      // If the user has no profile AND isn't the Super Admin, kick them out.
      // If they are Super Admin, they are allowed to proceed even without a researcher_profile.
      if (!activeProfile && !isPlatformBoss) { 
          console.error("❌ No Access found for user.");
          router.push('/dashboard/researcher'); 
          return; 
      }
      
      // Only set these states if a profile actually exists (Researcher view)
      if (activeProfile) {
        setProfile(activeProfile);
        setOrganization(org);
        setTier(org.billing_tier || 'free');
        setIsOrgVerified(org.is_verified || false);
      } else if (isPlatformBoss) {
        // Fallback for Super Admin viewing a site they don't "belong" to
        setTier('pro'); // Admin always sees full features
        setIsOrgVerified(true); // Admin always sees unblurred data
      }

      // --- CLEAN THE ID ---
      const rawId = (Array.isArray(params.nct_id) ? params.nct_id[0] : params.nct_id) ?? '';
      const cleanId = decodeURIComponent(rawId).trim();
      
      const urlParams = new URLSearchParams(window.location.search);
      const claimId = urlParams.get('claim_id');

      // --- REFACTORED: FETCH CLAIM (Super Admin Bypass) ---
      let query = supabase.from('claimed_trials').select('*').eq('nct_id', cleanId);

      // If NOT super admin, we must strictly filter by the user's organization
      if (!isPlatformBoss && org) {
          query = query.eq('organization_id', org.id);
      }

      if (claimId) {
          query = query.eq('id', claimId);
      }

      const { data: claimsData, error: claimError } = await query;
      
      const claimData = claimsData && claimsData.length > 0 ? claimsData[0] : null;
      
      if (claimError || !claimData) { 
          console.error("❌ Claim Verification Failed:", claimError);
          return; 
      }
      setClaim(claimData);

      // 3. Get Trial Data
      const { data: trialData } = await supabase.from('trials').select('*').eq('nct_id', cleanId).single();
      setTrial(trialData);

      // 4. Set Defaults
      setCustomSummary(claimData.custom_brief_summary || trialData.simple_summary || trialData.brief_summary || "");
      setQuestions(claimData.custom_screener_questions || trialData.screener_questions || []);
      setVideoUrl(claimData.video_url || "");
      setFaqs(claimData.custom_faq || []);
      setPhotos(claimData.facility_photos || []);

if (claimData.status === 'approved' || claimData.status === 'pending_verification') {
          // --- STEP 5: SITE-CENTRIC LEAD FETCHING (UPDATED FOR PRECISION) ---
          // Priority 1: Match by unique location_id (UUID) to isolate Scottsdale vs Gilbert
          // Priority 2: Fallback to site_facility string for legacy data from your CSV imports
          const claimId = claimData.site_location?.id || claimData.site_location?.location_id;

          const { data: siteLeads, error: leadErr } = await supabase
            .from('leads')
            .select('*')
            .eq('trial_id', cleanId)
            // UPDATED: This query now fetches both new UUID-linked leads and old name-linked leads
            .or(`location_id.eq.${claimId},site_facility.eq."${claimData.site_location?.facility || ''}"`)
            .order('created_at', { ascending: false });

          if (siteLeads) {
             // Secondary safety net to handle legacy data or city-only matches
             // This uses the updated isMatch helper we modified earlier
             const myLeads = siteLeads.filter(l => isMatch(l, claimData.site_location));

             // 6. Fetch Unread Counts for this isolated list
             const leadIds = myLeads.map(l => l.id);
             if (leadIds.length > 0) {
                 const { data: unreadMessages } = await supabase
                     .from('messages')
                     .select('lead_id')
                     .eq('is_read', false)
                     .eq('sender_role', 'patient')
                     .in('lead_id', leadIds);

                 const leadsWithCounts = myLeads.map(lead => ({
                     ...lead,
                     unread_count: unreadMessages?.filter(m => m.lead_id === lead.id).length || 0
                 }));
                 
                 setLeads(leadsWithCounts);
             } else {
                 setLeads([]);
             }
          }
      }
      setLoading(false);
    }
    fetchData();
  }, [params.nct_id, router]);

  // --- ANALYTICS CALCULATIONS ---
  const analyticsData = useMemo(() => {
      const totalLeads = leads.length;
      const enrolled = leads.filter(l => l.site_status === 'Enrolled').length;
      const notEligible = leads.filter(l => l.site_status === 'Not Eligible').length;
      const scheduled = leads.filter(l => l.site_status === 'Scheduled').length;
      
      const estimatedViews = Math.round(totalLeads * 18.5); 
      const estimatedStarts = Math.round(totalLeads * 2.5);
      const dropOffRate = estimatedStarts > 0 ? Math.round(((estimatedStarts - totalLeads) / estimatedStarts) * 100) : 0;

      const conversionRate = estimatedViews > 0 ? ((enrolled / estimatedViews) * 100).toFixed(2) : "0.00";
      const passRate = totalLeads > 0 ? Math.round(((totalLeads - notEligible) / totalLeads) * 100) : 0;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLeads = leads.filter(l => new Date(l.created_at) > sevenDaysAgo).length;

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
      
      const topFailures = Object.entries(failureCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 4)
          .map(([q, count]) => ({ question: q, count }));

      return { 
          totalLeads, enrolled, scheduled, notEligible,
          estimatedViews, estimatedStarts, dropOffRate,
          conversionRate, passRate, recentLeads, topFailures 
      };
  }, [leads, questions]);

// --- REALTIME LISTENER ---
  useEffect(() => {
      // 1. Helper to sync the unread count for a specific lead from the server
      const syncUnreadCount = async (leadId: string) => {
          const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('lead_id', leadId)
              .eq('sender_role', 'patient')
              .eq('is_read', false);
          
          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, unread_count: count || 0 } : l));
      };

      const channel = supabase
          .channel('researcher-dashboard-channel')
          
          // 2. Listen for Lead Status Changes
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
              setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
          })
          
          // 3. Listen for NEW Messages (INSERT)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
              if (payload.new.sender_role === 'patient') {
                  // If we aren't looking at this lead, refresh their count
                  if (selectedLeadId !== payload.new.lead_id) {
                      syncUnreadCount(payload.new.lead_id);
                  } else {
                      // If we ARE looking at them, show the message and mark read
                      setMessages(prev => [...prev, payload.new]);
                      supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
                  }
              }
          })

          // 4. THE MISSING FIX: Listen for READ STATUS Updates (UPDATE)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
              // Whenever a message changes (e.g. becomes read), refresh the badge count
              if (payload.new.lead_id) {
                  syncUnreadCount(payload.new.lead_id);
              }
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [selectedLeadId]);

  // --- DRAWER DATA ---
  useEffect(() => {
    if (!selectedLeadId) return;
    
    async function fetchDrawerData() {
        const { data: logs } = await supabase.from('audit_logs').select('*').eq('lead_id', selectedLeadId);
        setHistoryLogs(logs || []);
        
        const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', selectedLeadId).order('created_at', { ascending: true });
        setMessages(msgs || []);

        if (drawerTab === 'messages') {
            setLeads(prev => prev.map(l => l.id === selectedLeadId ? { ...l, unread_count: 0 } : l));
            await supabase.from('messages').update({ is_read: true }).eq('lead_id', selectedLeadId).eq('sender_role', 'patient');
        }
    }
    fetchDrawerData();
  }, [selectedLeadId, drawerTab]);

  useEffect(() => {
      if (drawerTab === 'messages' && chatContainerRef.current) {
          setTimeout(() => {
              if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
          }, 50);
      }
  }, [messages, drawerTab]);

  // --- LOGIC ---
  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const calculateStrength = () => {
    let score = 0;
    if (customSummary?.length > 50) score += 20;
    if (questions?.length > 0) score += 20;
    if (videoUrl) score += 30;
    if (faqs?.length > 0) score += 15;
    if (photos?.length > 0) score += 15;
    return Math.min(score, 100);
  };
  const strength = calculateStrength();

  // --- HANDLERS ---
  const addQuestion = () => setQuestions([...questions, { question: "", correct_answer: "Yes" }]);
  const removeQuestion = (index: number) => { const newQ = [...questions]; newQ.splice(index, 1); setQuestions(newQ); };
  const updateQuestionText = (index: number, text: string) => { const newQ = [...questions]; newQ[index].question = text; setQuestions(newQ); };
  const toggleAnswer = (index: number) => { const newQ = [...questions]; newQ[index].correct_answer = newQ[index].correct_answer === "Yes" ? "No" : "Yes"; setQuestions(newQ); };

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (index: number) => { const newF = [...faqs]; newF.splice(index, 1); setFaqs(newF); };
  const updateFaq = (index: number, field: 'question'|'answer', text: string) => { const newF = [...faqs]; newF[index][field] = text; setFaqs(newF); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${params.nct_id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('trial-assets').upload(fileName, file); 
    if (uploadError) { alert("Upload failed: " + uploadError.message); } 
    else { const { data } = supabase.storage.from('trial-assets').getPublicUrl(fileName); setPhotos(prev => [...prev, data.publicUrl]); }
    setUploading(false);
  };
  const removePhoto = (urlToRemove: string) => { setPhotos(photos.filter(url => url !== urlToRemove)); };

// --- TASK 3: PROFESSIONAL AUDIT TRAIL (REFACTORED ATTRIBUTION) ---
  const recordAction = async (action: string, detail: string) => {
    if (!selectedLeadId || !user) return;
    
    // Get professional authority string from Badge metadata
    const roleBadge = user.app_metadata?.role || "Team Member";
    const actorLabel = `${roleBadge.replace('_', ' ').toUpperCase()}: ${user.email}`;

    const newLog = { 
        id: Date.now(), 
        lead_id: selectedLeadId, 
        action, 
        detail, 
        performed_by: actorLabel, 
        created_at: new Date().toISOString() 
    };
    setHistoryLogs(prev => [newLog, ...prev]); 
    await supabase.from('audit_logs').insert({ 
        lead_id: selectedLeadId, 
        action, 
        detail, 
        performed_by: actorLabel
    });
  };

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const oldStatus = leads.find(l => l.id === leadId)?.site_status || 'New';
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, site_status: newStatus } : l));
    const { error } = await supabase.from('leads').update({ site_status: newStatus }).eq('id', leadId);
    if (error) {
        const { data: reverted } = await supabase.from('leads').select('site_status').eq('id', leadId).single();
        if (reverted) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, site_status: reverted.site_status } : l));
        alert(`Error updating status: ${error.message}`);
    } else {
        if (leadId === selectedLeadId) recordAction("Status Change", `Moved from ${oldStatus} to ${newStatus}`);
    }
  };

  // --- HELPER: NORMALIZE ANSWER (FIX FOR "I don't know" BUG) ---
  const options = ["Yes", "No", "I don't know"];
  const normalizeAnswer = (val: string) => {
      if (!val) return "Yes"; 
      const match = options.find(o => o.toLowerCase() === val.toLowerCase());
      return match || "Yes"; 
  };

  // --- NEW: UPDATE LEAD ANSWER (RESOLVE UNSURE) ---
  const updateLeadAnswer = async (index: number, newAnswer: string) => {
      if (!selectedLead) return;
      
      // FIX: Rebuild the array based on the Question List to ensure structure
      const newAnswers = questions.map((_, i) => {
          if (i === index) return newAnswer;
          if (selectedLead.answers && selectedLead.answers[i] !== undefined) {
              return selectedLead.answers[i];
          }
          return null; 
      });

      const oldAnswer = (selectedLead.answers && selectedLead.answers[index]) || "N/A";

      // 1. Optimistic Update
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, answers: newAnswers } : l));
      setEditingAnswerIndex(null);

      // 2. DB Update
      const { error } = await supabase.from('leads').update({ answers: newAnswers }).eq('id', selectedLead.id);
      
      if (error) {
          alert("Failed to update answer.");
          setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, answers: selectedLead.answers } : l));
      } else {
          recordAction("Data Correction", `Changed Q${index + 1} from "${oldAnswer}" to "${newAnswer}"`);
      }
  };

  const saveNote = async () => {
    if (!selectedLead) return;
    const oldNote = selectedLead.researcher_notes || "";
    if (noteBuffer === oldNote) return; 
    
    const { error } = await supabase.from('leads').update({ researcher_notes: noteBuffer }).eq('id', selectedLead.id);
    
    if (!error) {
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, researcher_notes: noteBuffer } : l));
        if (noteBuffer.trim() === "") {
             recordAction("Note Deleted", `Removed note: "${oldNote}"`);
        } else {
             recordAction("Note Updated", `"${noteBuffer}"`);
        }
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedLeadId) return;
    const newMessage = { id: Date.now(), lead_id: selectedLeadId, content: messageInput, sender_role: 'researcher', created_at: new Date().toISOString(), is_read: false };
    
    setMessages(prev => [...prev, newMessage]); 
    setMessageInput("");
    
    await supabase.from('messages').insert({ 
        lead_id: selectedLeadId, 
        content: messageInput, 
        sender_role: 'researcher' 
    });
    
    recordAction("Message Sent", "Outbound message to patient portal.");
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Ensure we save to the specific claim ID to support multi-site clinics
    const { error } = await supabase.from('claimed_trials').update({ 
        custom_brief_summary: customSummary, 
        custom_screener_questions: questions, 
        video_url: videoUrl, 
        custom_faq: faqs, 
        facility_photos: photos 
    }).eq('id', claim.id); 

    if (error) alert("Save failed.");
    else { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
    setIsSaving(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- TIER CALCULATION HELPER (GENEROUS LOGIC) ---
  const getLeadTier = (lead: any): { label: string, icon: any, style: string, type: TierType } | null => {
    if (!questions || questions.length === 0) return null;
    
    let wrong = 0;
    let unsure = 0;
    const total = questions.length;
    
    questions.forEach((q: any, i: number) => {
        const ans = lead.answers && lead.answers[i];
        if (ans !== q.correct_answer) {
             if (ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"))) {
                 unsure++;
             } else {
                 wrong++;
             }
        }
    });

    const mismatchRate = wrong / total;

    if (wrong === 0 && unsure === 0) return { label: "Perfect Match", icon: Gem, style: "bg-emerald-50 text-emerald-700 border-emerald-100", type: 'diamond' };
    if (wrong === 0) return { label: "Likely Match", icon: Medal, style: "bg-amber-50 text-amber-700 border-amber-100", type: 'gold' };
    if (mismatchRate <= 0.20) return { label: "Needs Review", icon: Shield, style: "bg-slate-100 text-slate-600 border-slate-200", type: 'silver' };
    
    return { label: "Potential Mismatch", icon: AlertCircle, style: "bg-rose-50 text-rose-700 border-rose-100", type: 'mismatch' };
  };

  // --- KANBAN COLUMN COMPONENT ---
  const StatusColumn = ({ status, label, icon: Icon, colorClass }: any) => {
    const columnLeads = leads.filter(l => {
        const matchesStatus = status === 'Not Eligible' 
            ? (l.site_status === 'Not Eligible' || l.site_status === 'Withdrawn')
            : (l.site_status || 'New') === status;
        
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const tier = getLeadTier(l);
        const matchesTier = tierFilter === 'all' || tier?.type === tierFilter;

        return matchesStatus && matchesSearch && matchesTier;
    });

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
            <div className={`p-3 border-b border-slate-200 flex items-center justify-between ${colorClass} bg-opacity-10`}>
                <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
                    <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">{label}</h3>
                </div>
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-slate-500 shadow-sm">{columnLeads.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {columnLeads.map(lead => {
                    const tier = getLeadTier(lead);
                    const TierIcon = tier?.icon || HelpCircle;

                    return (
                        <div key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setNoteBuffer(lead.researcher_notes || ""); setDrawerTab('overview'); }} className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md group ${selectedLeadId === lead.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'} relative`}>
                            
                            <div className="flex justify-between items-start mb-2">
                                {/* NEW: BLUR LOGIC APPLIED TO SENSITIVE CONTACT NAMES */}
                                <h4 className={`font-bold text-slate-900 text-sm transition-all ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[4px] select-none grayscale' : ''}`}>{lead.name}</h4>
                                {tier && (
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${tier.style}`}>
                                        <TierIcon className="h-3 w-3" />
                                        {tier.label}
                                    </div>
                                )}
                            </div>

                            <div className={`text-xs text-slate-500 mb-3 line-clamp-1 transition-all ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[4px] select-none grayscale' : ''}`}>{lead.email}</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>
                                {lead.site_status === 'Withdrawn' && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Withdrawn</span>}
                                {lead.site_status === 'Not Eligible' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Ineligible</span>}
                                <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {lead.unread_count > 0 && isOrgVerified && (
                                <div className="absolute bottom-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10 animate-in zoom-in">
                                    {lead.unread_count} Unread
                                </div>
                            )}
                        </div>
                    );
                })}
                {columnLeads.length === 0 && <div className="text-center py-10 opacity-30 text-xs font-bold text-slate-400 uppercase">No Candidates</div>}
            </div>
        </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (claim?.status !== 'approved' && claim?.status !== 'pending_verification') return <div className="p-10 text-center">Verification Required.</div>; 

  // --- ROBUST SCORING LOGIC ---
  const calculateMatchScore = () => {
    if (!selectedLead || !questions || questions.length === 0) return { count: 0, unsure: 0, wrong: 0, total: 0 };
    const total = questions.length;
    let count = 0;
    let unsure = 0;
    let wrong = 0;
    
    questions.forEach((q: any, i: number) => {
        const ans = selectedLead.answers && selectedLead.answers[i];
        
        if (ans === q.correct_answer) {
            count++;
        } 
        else if (ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"))) {
            unsure++;
        } else {
            wrong++;
        }
    });
    
    return { count, unsure, wrong, total };
  };
  const matchScore = calculateMatchScore();

  const getSortedHistory = () => {
      if (!selectedLead) return [];
      const appLog = { id: 'init', action: 'Application Received', detail: 'Patient submitted screening questionnaire.', performed_by: 'System', created_at: selectedLead.created_at };
      const allLogs = [...historyLogs, appLog];
      return allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };
  const sortedHistory = getSortedHistory();

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/researcher" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">{trial?.simple_title || trial?.title}</h1>
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 uppercase tracking-widest"><span className="bg-indigo-50 text-indigo-700 px-1.5 rounded">{trial?.nct_id}</span><span>• {claim?.site_location?.city}, {claim?.site_location?.state}</span></div>
            </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => handleTabChange('leads')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pipeline</button>
            <button onClick={() => handleTabChange('analytics')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><BarChart3 className="h-3 w-3" /> Analytics</button>
            <button onClick={() => handleTabChange('profile')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Edit Page</button>
            <button onClick={() => handleTabChange('media')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'media' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Media</button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* === LEADS PIPELINE VIEW === */}
        {activeTab === 'leads' && (
            <>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-14 border-b border-slate-200 bg-white/50 backdrop-blur-sm flex items-center px-6 justify-between flex-shrink-0">
                        {/* SEARCH BAR */}
                        <div className="relative w-64 mr-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search patients..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        
                        {/* TIER FILTERS */}
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-2 flex items-center gap-1"><Filter className="h-3 w-3" /> Filter:</span>
                            {[
                                { id: 'all', label: 'All', icon: Users, color: 'text-slate-600' },
                                { id: 'diamond', label: 'Perfect', icon: Gem, color: 'text-emerald-600' },
                                { id: 'gold', label: 'Likely', icon: Medal, color: 'text-amber-600' },
                                { id: 'silver', label: 'Review', icon: Shield, color: 'text-slate-600' },
                                { id: 'mismatch', label: 'Mismatch', icon: AlertCircle, color: 'text-rose-600' },
                            ].map((f: any) => (
                                <button 
                                    key={f.id}
                                    onClick={() => setTierFilter(f.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tierFilter === f.id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <f.icon className={`h-3 w-3 ${tierFilter === f.id ? f.color : ''}`} />
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold ml-auto"><span>Total: {leads.length}</span></div>
                    </div>

                    {/* NEW: UNVERIFIED TEASER RIBBON */}
                    {!isOrgVerified && !isSuperAdmin && (
                      <div className="bg-indigo-600 px-6 py-2 flex items-center justify-between text-white animate-in slide-in-from-top duration-500 shadow-lg z-10">
                          <div className="flex items-center gap-3">
                              <ShieldCheck className="h-4 w-4 text-indigo-200" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Identity Verification Required — Lead contact details are currently restricted</span>
                          </div>
                          <Link href="/dashboard/researcher/settings" className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors">Verify Now</Link>
                      </div>
                    )}

                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                        <div className="flex h-full gap-6">
                            <StatusColumn status="New" label="New Applicants" icon={Users} colorClass="bg-blue-500" />
                            <StatusColumn status="Contacted" label="In Screening" icon={Phone} colorClass="bg-amber-500" />
                            <StatusColumn status="Scheduled" label="Scheduled" icon={Calendar} colorClass="bg-purple-500" />
                            <StatusColumn status="Enrolled" label="Enrolled" icon={CheckCircle2} colorClass="bg-emerald-500" />
                            <StatusColumn status="Not Eligible" label="Archived / Withdrawn" icon={Archive} colorClass="bg-slate-500" />
                        </div>
                    </div>
                </div>

                {/* SIDE PANEL */}
                {selectedLead && (
                    <div className="w-[600px] border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-20 transition-all duration-300">
                        {/* SIDE PANEL HEADER */}
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 bg-slate-50/50">
                            <div>
                                <h2 className={`font-bold text-slate-900 text-lg transition-all ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[5px] select-none grayscale' : ''}`}>{selectedLead.name}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ID: {String(selectedLead.id).slice(0,8)}</span>
                                    
                                    {/* DYNAMIC TIER BADGE IN SIDE PANEL */}
                                    {(() => {
                                        const tier = getLeadTier(selectedLead);
                                        const TierIcon = tier?.icon || HelpCircle;
                                        return tier ? (
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${tier.style}`}>
                                                <TierIcon className="h-3 w-3" />
                                                {tier.label}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2"><button onClick={() => setSelectedLeadId(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="h-5 w-5" /></button></div>
                        </div>

                        <div className="flex border-b border-slate-200 px-6">
                            <button onClick={() => setDrawerTab('overview')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList className="h-4 w-4" /> Overview</button>
                            <button onClick={() => setDrawerTab('messages')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 mr-6 ${drawerTab === 'messages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <MessageSquare className="h-4 w-4" /> Messages
                                {selectedLead.unread_count > 0 && isOrgVerified && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{selectedLead.unread_count}</span>}
                            </button>
                            <button onClick={() => setDrawerTab('history')} className={`pb-3 pt-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${drawerTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><History className="h-4 w-4" /> History</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {drawerTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* CONTACT INFO */}
                                    <div><h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Contact Details</h3><div className="grid grid-cols-2 gap-4"><div className="flex flex-col p-3 border border-slate-100 rounded-lg bg-white shadow-sm"><div className="flex items-center gap-3 mb-1"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Mail className="h-4 w-4" /></div><span className="text-[9px] font-bold text-slate-400 uppercase">Email</span></div><div className={`text-xs font-bold text-slate-700 truncate ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[6px] select-none' : ''}`}>{selectedLead.email}</div></div><div className="flex flex-col p-3 border border-slate-100 rounded-lg bg-white shadow-sm"><div className="flex items-center gap-3 mb-1"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><Phone className="h-4 w-4" /></div><span className="text-[9px] font-bold text-slate-400 uppercase">Phone</span></div><div className={`text-xs font-bold text-slate-700 truncate ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[6px] select-none' : ''}`}>{selectedLead.phone}</div></div></div></div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline Status</div><div className="relative w-48"><select className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-900 font-bold text-sm rounded-lg py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm" value={selectedLead.site_status || 'New'} onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)}><option value="New">New Applicant</option><option value="Contacted">Contacted / Screening</option><option value="Scheduled">Scheduled Visit</option><option value="Enrolled">Enrolled</option><option value="Not Eligible">Not Eligible</option><option value="Withdrawn">Withdrawn</option></select><ChevronDown className="absolute right-3 top-3 h-3 w-3 text-slate-400 pointer-events-none" /></div></div>
                                    
                                    {/* CLINICAL NOTES */}
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-64">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Clinical Notes</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-400 italic">Auto-save</span>
                                                    <button onClick={saveNote} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"><Save className="h-3 w-3" /> Save Note</button>
                                                </div>
                                            </div>
                                            <textarea className={`flex-1 w-full p-4 text-sm text-slate-800 outline-none resize-none font-medium leading-relaxed ${(!isOrgVerified && !isSuperAdmin) ? 'blur-[2px] opacity-50' : ''}`} placeholder="Enter clinical observations..." value={noteBuffer} onChange={(e) => setNoteBuffer(e.target.value)} onBlur={saveNote} disabled={!isOrgVerified && !isSuperAdmin} />
                                    </div>

                                    {/* SCREENER RESPONSES - WITH EDUCATIONAL CONTEXT */}
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Screener Responses & History</h3>
                                        
                                        {/* --- EDUCATIONAL ALERT BOX --- */}
                                        {(matchScore.wrong ?? 0) > 0 ? (
                                            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-amber-800">Criteria Mismatch ({(matchScore.wrong ?? 0)} Missed)</h4>
                                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                                        This patient answered incorrectly. Often this is a mistake. Call to verify. 
                                                        <br/><br/>
                                                        <strong>💡 Pro Tip:</strong> If they clarify their answer about a question on the call, update their answer to "Yes" or "No" by clicking the <strong>Pencil Icon <PenSquare className="inline h-3 w-3" /></strong> below. Correcting the answer will automatically update their Tier score.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : matchScore.unsure > 0 ? (
                                            <div className="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                                                <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-indigo-800">Clarification Needed ({matchScore.unsure} Unsure)</h4>
                                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                                        This candidate is a strong match but needs clarification on a few points. 
                                                        <br/><br/>
                                                        <strong>💡 Pro Tip:</strong> If they clarify their answer about a question on the call, update "I don't know" to "Yes" or "No" by clicking the <strong>Pencil Icon <PenSquare className="inline h-3 w-3" /></strong> below. Correcting the answer will automatically update their Tier score.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2"><FileText className="h-3 w-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Questionnaire Data</span></div>
                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${matchScore.count === matchScore.total ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                    <Calculator className="h-3 w-3" />
                                                    {matchScore.count}/{matchScore.total} Met
                                                    {matchScore.unsure > 0 && <span className="ml-1 text-amber-600">({matchScore.unsure} Unsure)</span>}
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                                {questions.map((q: any, i: number) => { 
                                                    const ans = selectedLead.answers && selectedLead.answers[i]; 
                                                    const isMatch = ans === q.correct_answer; 
                                                    const isUnsure = ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"));
                                                    const isEditing = editingAnswerIndex === i;

                                                    let cardClass = 'bg-red-50 border-red-200';
                                                    let badgeClass = 'text-red-700 bg-white border-red-200 shadow-sm';

                                                    if (isMatch) {
                                                        cardClass = 'bg-slate-50 border-slate-200';
                                                        badgeClass = 'text-emerald-700 bg-white border-emerald-200 shadow-sm';
                                                    } else if (isUnsure) {
                                                        cardClass = 'bg-orange-50 border-orange-200';
                                                        badgeClass = 'text-orange-700 bg-white border-orange-200 shadow-sm';
                                                    }

                                                    return ( 
                                                        <div key={i} className={`p-4 rounded-xl border ${cardClass} relative group/card`}>
                                                            <p className="text-sm text-slate-800 font-medium mb-3 leading-relaxed pr-8">{q.question}</p>
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-2 animate-in fade-in">
                                                                    <select 
                                                                        className="flex-1 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                                        value={tempAnswer}
                                                                        onChange={(e) => setTempAnswer(e.target.value)}
                                                                    >
                                                                        <option value="Yes">Yes</option>
                                                                        <option value="No">No</option>
                                                                        <option value="I don't know">I don't know</option>
                                                                    </select>
                                                                    <button onClick={() => updateLeadAnswer(i, tempAnswer)} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-indigo-700">Save</button>
                                                                    <button onClick={() => setEditingAnswerIndex(null)} className="text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Patient Answer:</span>
                                                                        <span className={`text-xs font-bold px-3 py-1 rounded-md border ${badgeClass}`}>{ans || "N/A"}</span>
                                                                        <button 
                                                                            onClick={() => { setEditingAnswerIndex(i); setTempAnswer(normalizeAnswer(ans)); }} 
                                                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all opacity-0 group-hover/card:opacity-100"
                                                                            title="Correct this answer"
                                                                        >
                                                                            <PenSquare className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                    {!isMatch && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Required:</span>
                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded">{q.correct_answer}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div> 
                                                    ); 
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {drawerTab === 'messages' && (
                                <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
                                    {!isOrgVerified && <LockedOverlay title="Messaging Restricted" desc="Patient identity and clinical messaging are locked until the PI verifies their credentials." />}
                                    <div ref={chatContainerRef} className={`flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 ${!isOrgVerified ? 'blur-md pointer-events-none' : ''}`}>
                                            <div className="text-center text-[10px] text-slate-400 uppercase font-bold my-4">— Secure HIPAA Bridge —</div>
                                            {messages.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.sender_role === 'researcher' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender_role === 'researcher' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}>
                                                        <div>{msg.content}</div>
                                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.sender_role === 'researcher' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {formatTime(msg.created_at)}
                                                            {msg.sender_role === 'researcher' && (
                                                                <span>{msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-400"><MessageSquare className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs">No messages yet.</p><p className="text-[10px] mt-1">Send a message to the patient's portal.</p></div>}
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2"><input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type a secure message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} /><button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Send className="h-4 w-4" /></button></div>
                                </div>
                            )}
                            {drawerTab === 'history' && (
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /> Site Ledger</h3><div className="space-y-6 relative pl-2"><div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-100"></div>{sortedHistory.map((log: any, i: number) => { const isPatient = log.performed_by === 'Patient' || log.performed_by === 'System'; return ( <div key={i} className="relative flex gap-4 animate-in slide-in-from-left-2"><div className={`w-3 h-3 rounded-full ring-4 ring-white z-10 shrink-0 mt-1.5 ${isPatient ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div><div><div className="text-xs font-bold text-slate-900">{log.action}</div><div className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()} by <span className="text-indigo-600 font-bold">{log.performed_by}</span></div><div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">{log.detail}</div></div></div> ); })}</div></div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center"><span className="text-[10px] text-slate-400">Lead ID: {selectedLead.id}</span></div>
                    </div>
                )}
            </>
        )}
        
        {activeTab === 'analytics' && (
            <div className="flex-1 p-8 bg-slate-50 h-full overflow-y-auto">
               {(tier === 'free' && !isSuperAdmin) && <LockedOverlay title="Unlock Site Intelligence" desc="Access deep insights into recruitment performance, drop-off rates, and patient demographics." />}
               <div className={(tier === 'free' && !isSuperAdmin) ? 'filter blur-sm pointer-events-none select-none opacity-50' : 'animate-in fade-in slide-in-from-bottom-2 space-y-8 pb-10'}>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Eye className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Est.</span></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedViews.toLocaleString()}</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total Page Views</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><MousePointer2 className="h-5 w-5" /></div></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.conversionRate}%</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Visit-to-Enrolled</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Percent className="h-5 w-5" /></div><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{analyticsData.dropOffRate}% Drop-off</span></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">{analyticsData.estimatedStarts.toLocaleString()}</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Started Screener</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2"><div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><DollarSign className="h-5 w-5" /></div></div>
                            <div className="text-3xl font-extrabold text-slate-900 mt-2">$0.00</div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Cost Per Randomization</p>
                        </div>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8"><h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-600" /> Patient Acquisition Funnel</h3><div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg">Last 30 Days</div></div>
                            <div className="space-y-6 relative">
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">Discovery</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-indigo-200 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-indigo-50 w-full opacity-50"></div><span className="relative z-10 font-bold text-indigo-900">{analyticsData.estimatedViews}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">100%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-blue-600 transition-colors uppercase tracking-widest">Starts</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-blue-300 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-blue-50 transition-all duration-1000" style={{ width: '40%' }}></div><span className="relative z-10 font-bold text-blue-900">{analyticsData.estimatedStarts}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">~40%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-amber-600 transition-colors uppercase tracking-widest">Completed</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-amber-400 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-amber-50 transition-all duration-1000" style={{ width: `${(analyticsData.totalLeads / (analyticsData.estimatedStarts || 1)) * 100}%` }}></div><span className="relative z-10 font-bold text-amber-900">{analyticsData.totalLeads}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{Math.round((analyticsData.totalLeads / (analyticsData.estimatedStarts || 1)) * 100)}%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-purple-600 transition-colors uppercase tracking-widest">Qualified</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-purple-500 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-purple-50 transition-all duration-1000" style={{ width: analyticsData.totalLeads ? `${((analyticsData.totalLeads - analyticsData.notEligible) / analyticsData.totalLeads) * 100}%` : '0%' }}></div><span className="relative z-10 font-bold text-purple-900">{analyticsData.totalLeads - analyticsData.notEligible}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{analyticsData.passRate}%</div></div>
                                <div className="flex items-center group"><div className="w-32 text-xs font-bold text-slate-500 text-right pr-4 group-hover:text-emerald-600 transition-colors uppercase tracking-widest">Enrolled</div><div className="flex-1 h-12 bg-slate-50 rounded-r-xl border-l-4 border-emerald-500 flex items-center px-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-emerald-50 transition-all duration-1000" style={{ width: analyticsData.totalLeads ? `${(analyticsData.enrolled / analyticsData.totalLeads) * 100}%` : '0%' }}></div><span className="relative z-10 font-bold text-emerald-900">{analyticsData.enrolled}</span></div><div className="w-16 text-center text-[10px] text-slate-400 font-bold">{analyticsData.totalLeads ? Math.round((analyticsData.enrolled / analyticsData.totalLeads) * 100) : 0}%</div></div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2 uppercase tracking-tight"><Filter className="h-5 w-5 text-red-500" /> Criteria Drop-off</h3>
                            <p className="text-xs text-slate-500 mb-8 uppercase tracking-widest font-bold">Primary reasons for participant mismatch.</p>
                            {analyticsData.topFailures.length > 0 ? (
                                <div className="space-y-6 flex-1">
                                    {analyticsData.topFailures.map((item, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2 uppercase tracking-tighter">
                                                <span className="truncate max-w-[200px]">{item.question}</span>
                                                <span className="text-red-500">{Math.round((item.count / analyticsData.totalLeads) * 100)}% ({item.count})</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-red-400 rounded-full transition-all duration-1000" style={{ width: `${(item.count / analyticsData.totalLeads) * 100}%` }}></div></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (<div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2 border border-slate-100"><CheckCircle2 className="h-6 w-6 text-emerald-300" /></div><p className="text-xs font-bold uppercase tracking-widest">No failures recorded.</p></div>)}
                            <div className="mt-8 pt-6 border-t border-slate-100"><div className="flex items-start gap-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Lightbulb className="h-4 w-4" /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimization Tip</p><p className="text-xs font-medium text-slate-600 mt-0.5 leading-relaxed">{analyticsData.passRate < 20 ? "Risk detected: Your screening logic may be too strict." : "Enrollment velocity is currently stable."}</p></div></div></div>
                        </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-indigo-200 group"><div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 flex items-center justify-center text-[10px] font-bold text-indigo-600 group-hover:rotate-12 transition-transform">45%</div><div><div className="text-sm font-bold text-slate-900 uppercase tracking-tight">Direct Network</div><div className="text-xs text-slate-500">dermtrials.health</div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-blue-200 group"><div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 flex items-center justify-center text-[10px] font-bold text-blue-600 group-hover:rotate-12 transition-transform">30%</div><div><div className="text-sm font-bold text-slate-900 uppercase tracking-tight">Public Outreach</div><div className="text-xs text-slate-500">Social Media Funnels</div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-amber-200 group"><div className="w-12 h-12 rounded-full border-4 border-amber-100 border-t-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-600 group-hover:rotate-12 transition-transform">25%</div><div><div className="text-sm font-bold text-slate-900 uppercase tracking-tight">Referrals</div><div className="text-xs text-slate-500">Facility Partners</div></div></div>
                   </div>
               </div>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50 relative custom-scrollbar">
                {(tier === 'free' && !isSuperAdmin) && <LockedOverlay title="Unlock Site Branding" desc="Pro sites can customize protocol text, screening logic, and patient-facing recruitment summaries." />}
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20">
                    <div className={(tier === 'free' && !isSuperAdmin) ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex gap-5"><div className="p-3 bg-white text-indigo-600 rounded-xl h-fit shadow-sm"><Lightbulb className="h-6 w-6" /></div><div><h4 className="font-bold text-indigo-900 text-sm mb-1 uppercase tracking-tight">Editorial Control</h4><p className="text-indigo-700 text-xs leading-relaxed font-medium">Use this space to refine the language for your patient-facing flyers and public site listings. Edits here will overwrite the AI-generated defaults.<br/><br/><b>Note:</b> You must click "Save Changes" at the bottom to sync your site portfolio.</p></div></div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group mt-8"><h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs flex items-center gap-2">Public Study Summary</h3><textarea className="w-full h-72 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-700 text-sm leading-relaxed font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} placeholder="Provide a patient-friendly protocol description..." /></div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8"><div className="flex justify-between items-center mb-8"><h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Medical Screening Logic</h3><button onClick={addQuestion} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 uppercase tracking-tighter border border-indigo-100">+ Add Criterion</button></div><div className="space-y-4">{questions.map((q, idx) => (<div key={idx} className="flex gap-4 items-center group/row animate-in slide-in-from-left-2"><div className="flex-1"><input type="text" value={q.question} onChange={(e) => updateQuestionText(idx, e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" placeholder="Question for patient..." /></div><button onClick={() => toggleAnswer(idx)} className={`w-28 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${q.correct_answer === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-200'}`}>{q.correct_answer}</button><button onClick={() => removeQuestion(idx)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 className="h-4 w-4" /></button></div>))}</div></div>
                        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-100 p-6 z-40 flex justify-end px-12 shadow-2xl"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 disabled:opacity-70 transition-all transform active:scale-95">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Workspace Changes</button></div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'media' && (
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50 relative custom-scrollbar">
                {(tier === 'free' && !isSuperAdmin) && <LockedOverlay title="Site Media Management" desc="Scale your site outreach. Professional clinics get 3x higher patient engagement by including videos and facility photography." />}
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-20 relative">
                    <div className={(tier === 'free' && !isSuperAdmin) ? 'filter blur-sm pointer-events-none select-none opacity-50' : ''}>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm"><div className="flex items-start gap-5 mb-8"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm"><Video className="h-6 w-6" /></div><div><h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Video Greeting</h3><p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed max-w-lg">Feature a short introduction from the Principle Investigator. <br/><span className="text-indigo-600 font-black underline decoration-2">Why?</span> Humanizing the study establishes trust before the first screening call.</p></div></div><input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube, Vimeo, or Loom URL..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold" /></div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8"><div className="flex items-start justify-between mb-8"><div className="flex items-start gap-5"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm"><ImageIcon className="h-6 w-6" /></div><div><h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Site Photography</h3><p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed max-w-lg">Upload high-res photos of your facility. Patients who see where they are going are 2x more likely to attend site visits.</p></div></div><label className="cursor-pointer text-[10px] font-black text-indigo-600 bg-indigo-50 px-5 py-3 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 uppercase tracking-widest border border-indigo-100">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Add Photo <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} /></label></div>{photos.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{photos.map((url, idx) => (<div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm transition-all hover:shadow-lg"><img src={url} alt="Facility" className="w-full h-full object-cover" /><button onClick={() => removePhoto(url)} className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"><Trash2 className="h-4 w-4" /></button></div>))}</div>) : <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50"><ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No site media yet</p></div>}</div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8"><div className="flex justify-between items-center mb-10"><div className="flex items-center gap-5"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm"><MessageSquare className="h-6 w-6" /></div><div><h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Patient FAQs</h3><p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed">Address common concerns like parking, travel costs, or insurance.</p></div></div><button onClick={addFaq} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-5 py-3 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 uppercase tracking-widest active:scale-95 shadow-sm">+ New Item</button></div><div className="space-y-4">{faqs.map((f, idx) => (<div key={idx} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md"><button onClick={() => removeFaq(idx)} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button><input type="text" value={f.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-transparent border-b border-slate-200 pb-2 mb-3 text-sm font-bold text-slate-900 outline-none uppercase tracking-tighter" placeholder="Clinic logistics question?" /><textarea value={f.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 font-medium outline-none resize-none leading-relaxed" placeholder="Detailed clinic response..." rows={2} /></div>))}</div></div>
                        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/90 backdrop-blur-md border-t border-slate-100 p-6 z-40 flex justify-end px-12 shadow-2xl"><button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Media & Logic</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* TOAST */}
        {showToast && <div className="absolute bottom-10 right-10 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 border border-white/10 z-50"><div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm"><Check className="h-3 w-3" /></div> Site Portfolio Synced</div>}

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}