"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, X } from "lucide-react";

// Components
import TrialManager from "../components/TrialManager";
import ResearcherApprovals from "../components/ResearcherApprovals";
import SupportInbox from "../components/SupportInbox";
import SecurityMFA from "../components/SecurityMFA";

function SystemOpsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'trials';

  // --- 1. SHARED STATE ---
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState({ processed: 0, success: 0, failed: 0 });
  const [batchStatus, setBatchStatus] = useState(""); 
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [reviewedList, setReviewedList] = useState<any[]>([]);
  
  // Researcher State
  const [researcherList, setResearcherList] = useState<any[]>([]);
  const [verifiedList, setVerifiedList] = useState<any[]>([]); 
  const [expandedResearcherId, setExpandedResearcherId] = useState<string | null>(null);

  // Security & Support State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  
  // System Metadata
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastAiTime, setLastAiTime] = useState<string | null>(null);
  
  // MFA Enrollment Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [mfaError, setMfaError] = useState('');

  // --- 2. AUTH & INIT ---
  useEffect(() => {
    async function checkUserAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      
      const { data: adminRecord } = await supabase.from('admins').select('role').eq('user_id', user.id).single();
      if (!adminRecord) { router.push('/'); return; }
      
      await Promise.all([
        fetchLists(), 
        fetchResearcherQueue(), 
        fetchVerifiedResearchers(), 
        fetchSystemStats(), 
        fetchMfaStatus(), 
        fetchTickets()
      ]);
      setLoading(false);
    }
    checkUserAndLoad();
  }, [router]);

  // --- 3. DATA LOGIC ---

  const fetchMfaStatus = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error) {
          const factors = data.totp || data.all || [];
          setMfaFactors(factors);
      }
  };

  const fetchResearcherQueue = async () => {
    // 1. Fetch Unverified Organizations
    const { data: organizations } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

    if (!organizations || organizations.length === 0) {
        setResearcherList([]);
        return;
    }

    const orgIds = organizations.map(o => o.id);

    // 2. Fetch Profiles & Assignments
    const { data: profiles } = await supabase
        .from('researcher_profiles')
        .select(`*, claimed_trials (*, trials (title))`)
        .in('organization_id', orgIds);

    const { data: assignments } = await supabase
        .from('trial_assignments')
        .select(`*, team_members(*)`)
        .in('organization_id', orgIds);

    // 3. Group and Enhance Names
    const grouped = organizations.map((org: any) => {
        let orgProfiles = profiles?.filter(p => p.organization_id === org.id) || [];
        
        // FIX: Construct Full Name if missing (First + Last)
        orgProfiles = orgProfiles.map(p => ({
            ...p,
            full_name: p.full_name || (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : null) || p.email
        }));

        const orgAssignments = assignments?.filter(a => a.organization_id === org.id) || [];
        
        // Find OAM (User ID present) vs Investigators
        const oam = orgProfiles.find(p => p.user_id) || orgProfiles[0] || null;
        const investigators = orgProfiles.filter(p => p.id !== oam?.id);

        const allTrials: any[] = [];
        orgProfiles.forEach(p => {
            p.claimed_trials?.forEach((t: any) => {
                if (!allTrials.find(existing => existing.id === t.id)) {
                    allTrials.push(t);
                }
            });
        });

        return {
            id: org.id,
            organization: org,
            oam: oam,
            investigators: investigators,
            trials: allTrials,
            assignments: orgAssignments
        };
    });

    setResearcherList(grouped);
  };

  const fetchVerifiedResearchers = async () => {
    // 1. Fetch Verified Organizations
    const { data: organizations } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_verified', true)
        .order('name', { ascending: true }); // Sort by Name for active list

    if (!organizations || organizations.length === 0) {
        setVerifiedList([]);
        return;
    }

    const orgIds = organizations.map(o => o.id);

    const { data: profiles } = await supabase
        .from('researcher_profiles')
        .select(`*, claimed_trials (*, trials (title))`)
        .in('organization_id', orgIds);

    // 3. Group and Enhance Names (Verified List)
    const grouped = organizations.map((org: any) => {
        let orgProfiles = profiles?.filter(p => p.organization_id === org.id) || [];
        
        // FIX: Construct Full Name here too
        orgProfiles = orgProfiles.map(p => ({
            ...p,
            full_name: p.full_name || (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : null) || p.email
        }));

        // Find OAM vs Investigators
        const oam = orgProfiles.find(p => p.user_id) || orgProfiles[0] || null;
        const investigators = orgProfiles.filter(p => p.id !== oam?.id);
        
        const allTrials: any[] = [];
        orgProfiles.forEach(p => {
            p.claimed_trials?.forEach((t: any) => {
                if (!allTrials.find(existing => existing.id === t.id)) {
                    allTrials.push(t);
                }
            });
        });

        return {
            id: org.id,
            organization: org,
            oam: oam,
            investigators: investigators,
            trials: allTrials,
            assignments: [] // Optional for read-only view
        };
    });

    setVerifiedList(grouped);
  };

  const fetchLists = async () => {
    const { data: pending } = await supabase.from('trials').select('*').eq('is_reviewed', false).order('last_updated', { ascending: false }).limit(50); 
    const { data: reviewed } = await supabase.from('trials').select('*').eq('is_reviewed', true).order('last_updated', { ascending: false }).limit(50);
    if (pending) setPendingList(pending);
    if (reviewed) setReviewedList(reviewed);
  };

  const fetchSystemStats = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const sync = data.find(d => d.key === 'last_sync_run');
      const ai = data.find(d => d.key === 'last_ai_run');
      if (sync?.value) setLastSyncTime(new Date(sync.value).toLocaleString());
      if (ai?.value) setLastAiTime(new Date(ai.value).toLocaleString());
    }
  };

  const fetchTickets = async () => {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (data) setTickets(data);
  };

  // --- 4. ACTION HANDLERS ---
  const handleSync = async () => {
    setSyncLoading(true); setSyncStatus({ type: null, msg: '' });
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatus({ type: 'success', msg: data.message });
        await supabase.from('system_settings').upsert({ key: 'last_sync_run', value: new Date().toISOString() });
        fetchLists(); fetchSystemStats();
      } else setSyncStatus({ type: 'error', msg: data.message || "Sync failed." });
    } catch { setSyncStatus({ type: 'error', msg: 'Connection failed.' }); }
    finally { setSyncLoading(false); }
  };

  const runAIAgent = async () => {
    setAiLoading(true); setAiLogs([]); setAiStats({ processed: 0, success: 0, failed: 0 });
    let keepGoing = true; let batchCount = 1;
    try {
      while (keepGoing) {
        setBatchStatus(`Processing Batch #${batchCount}...`);
        const res = await fetch('/api/generate');
        const data = await res.json();
        if (data.details && data.details.length > 0) {
          setAiLogs(prev => [...prev, ...data.details]);
          const newSuccess = data.details.filter((d: any) => d.status === 'Success').length;
          setAiStats(prev => ({ processed: prev.processed + data.details.length, success: prev.success + newSuccess, failed: prev.failed + (data.details.length - newSuccess) }));
          fetchLists(); await wait(2000); batchCount++;
        } else keepGoing = false;
      }
      await supabase.from('system_settings').upsert({ key: 'last_ai_run', value: new Date().toISOString() });
      fetchSystemStats();
    } finally { setAiLoading(false); setBatchStatus(""); }
  };

  const toggleReviewStatus = async (nctId: string, newStatus: boolean) => {
    await supabase.from('trials').update({ is_reviewed: newStatus }).eq('nct_id', nctId);
    fetchLists();
  };

  const verifyResearcher = async (orgId: string | null) => {
    if (!orgId) return;
    const { error: orgErr } = await supabase.from('organizations').update({ is_verified: true }).eq('id', orgId);
    if (!orgErr) {
        await Promise.all([
            supabase.from('researcher_profiles').update({ is_verified: true, status: 'verified' }).eq('organization_id', orgId),
            supabase.from('team_members').update({ status: 'verified' }).eq('organization_id', orgId),
            supabase.from('claimed_trials').update({ status: 'approved' }).eq('organization_id', orgId)
        ]);
        fetchResearcherQueue(); fetchVerifiedResearchers();
    }
  };

  const rejectResearcher = async (orgId: string | null) => {
    if(!confirm("Are you sure?")) return;
    if (orgId) await supabase.from('organizations').delete().eq('id', orgId);
    fetchResearcherQueue();
  };

  const resolveTicket = async (id: string) => {
      if(!confirm("Mark as resolved?")) return;
      await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', id);
      fetchTickets();
  };

  const startMfaEnrollment = async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (!error) { setFactorId(data.id); setQrCodeUrl(data.totp.qr_code); setShowQrModal(true); setVerifyCode(""); setMfaError(""); }
      else alert(error.message);
  };

  const verifyMfaEnrollment = async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: verifyCode });
      if (error) setMfaError("Invalid code.");
      else { setShowQrModal(false); fetchMfaStatus(); }
  };

  const removeMfaFactor = async (id: string) => {
      if(!confirm("Disable 2FA?")) return;
      await supabase.auth.mfa.unenroll({ factorId: id });
      fetchMfaStatus();
  };

  const viewDocument = async (path: string) => {
    const { data } = await supabase.storage.from('verifications').createSignedUrl(path, 600);
    if (data) setViewDocUrl(data.signedUrl);
  };

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-10 max-w-7xl mx-auto">
        {/* --- DYNAMIC HEADER --- */}
        <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">
                {activeTab === 'researchers' ? 'Institutional Approvals' : 
                 activeTab === 'verified' ? 'Active Institutions' :
                 activeTab === 'support' ? 'Support Inbox' :
                 activeTab === 'security' ? 'Security & MFA' : 'Trial Management'}
            </h1>
            <p className="text-slate-500 font-medium">
                {activeTab === 'researchers' ? 'Verify pending clinics and their teams.' :
                 activeTab === 'verified' ? 'Monitor active sites and personnel.' :
                 activeTab === 'support' ? 'Manage incoming help requests.' :
                 activeTab === 'security' ? 'System access control.' : 'Oversee data ingestion and quality.'}
            </p>
        </div>

        {activeTab === 'trials' && (
            <TrialManager 
                syncLoading={syncLoading} syncStatus={syncStatus} handleSync={handleSync} lastSyncTime={lastSyncTime}
                aiLoading={aiLoading} aiLogs={aiLogs} aiStats={aiStats} batchStatus={batchStatus} runAIAgent={runAIAgent} lastAiTime={lastAiTime}
                pendingList={pendingList} reviewedList={reviewedList} toggleReviewStatus={toggleReviewStatus}
            />
        )}
        
        {activeTab === 'researchers' && (
            <ResearcherApprovals 
                researcherList={researcherList} 
                expandedId={expandedResearcherId}
                setExpandedId={setExpandedResearcherId}
                viewDocument={viewDocument} 
                rejectResearcher={rejectResearcher} 
                verifyResearcher={verifyResearcher} 
            />
        )}

        {activeTab === 'verified' && (
            <ResearcherApprovals 
                researcherList={verifiedList} 
                expandedId={expandedResearcherId}
                setExpandedId={setExpandedResearcherId}
                viewDocument={viewDocument} 
                isReadOnly={true}
            />
        )}

        {activeTab === 'support' && <SupportInbox tickets={tickets} resolveTicket={resolveTicket} refresh={fetchTickets} />}
        {activeTab === 'security' && <SecurityMFA mfaFactors={mfaFactors} startEnrollment={startMfaEnrollment} removeFactor={removeMfaFactor} />}

        {/* DOCUMENT VIEWER MODAL */}
        {viewDocUrl && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-4xl h-full flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold">Credential Verification</h3>
                        <button onClick={() => setViewDocUrl(null)} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
                    </div>
                    <iframe src={viewDocUrl} className="flex-1 w-full" />
                </div>
            </div>
        )}

        {showQrModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                    <h3 className="font-bold text-xl mb-6">Scan QR Code</h3>
                    <img src={qrCodeUrl} alt="QR" className="mx-auto mb-6 w-48 h-48 border p-2 rounded-xl shadow-inner" />
                    <input 
                      type="text" 
                      className="w-full text-center text-2xl font-mono p-3 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="123456" 
                      maxLength={6}
                      value={verifyCode} 
                      onChange={e => setVerifyCode(e.target.value.replace(/\D/g,''))} 
                    />
                    {mfaError && <p className="text-red-500 text-xs font-bold mb-4">{mfaError}</p>}
                    <div className="flex gap-3">
                        <button onClick={() => setShowQrModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50">Cancel</button>
                        <button onClick={verifyMfaEnrollment} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Verify</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function SystemOps() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>}>
      <SystemOpsContent />
    </Suspense>
  );
}