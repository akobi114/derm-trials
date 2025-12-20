"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  Users, 
  Trash2, 
  X, 
  UserPlus, 
  Link as LinkIcon, 
  Search, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Check, 
  Mail, 
  Copy, 
  CheckCheck, 
  AlertCircle
} from 'lucide-react';

export default function TeamManagement() {
  // ------------------------------------------------------------------
  // CORE STATE
  // ------------------------------------------------------------------
  const [profile, setProfile] = useState<any>(null);
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ------------------------------------------------------------------
  // MODAL STATES
  // ------------------------------------------------------------------
  
  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("coordinator");
  const [inviteClaims, setInviteClaims] = useState<string[]>([]);
  const [inviteSearch, setInviteSearch] = useState(""); 
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Success Modal
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [successEmail, setSuccessEmail] = useState(""); // FIX: Holds the email for the success message so the form can be cleared
  const [copySuccess, setCopySuccess] = useState(false);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Access Management Modal
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [tempSelectedTrials, setTempSelectedTrials] = useState<string[]>([]); 
  const [accessSearch, setAccessSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<'all' | 'assigned'>('all');
  const [savingPermissions, setSavingPermissions] = useState(false);

  // ------------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------------
  const fetchTeamData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profileData } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (!profileData) return;
    setProfile(profileData);

    const [teamRes, trialsRes] = await Promise.all([
      supabase.from('team_members').select('*').eq('researcher_id', profileData.id),
      supabase.from('claimed_trials').select('*, trials(*)').eq('researcher_id', profileData.id)
    ]);

    setTeamMembers(teamRes.data || []);
    
    // Normalize trial data for the list
    const formattedTrials = trialsRes.data?.map((t: any) => ({
        ...t.trials,
        claim_id: String(t.id),
        site_location: t.site_location
    })) || [];
    
    setMyTrials(formattedTrials);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // ------------------------------------------------------------------
  // INVITE LOGIC
  // ------------------------------------------------------------------
  
  // FIX: Helper to open modal and clear state simultaneously
  const openInviteModal = () => {
      setInviteEmail(""); // Clear the input
      setInviteRole("coordinator");
      setInviteClaims([]);
      setInviteSearch("");
      setIsInviteModalOpen(true);
  };

  const handleViewInvite = (member: any) => {
      if (!member.token) {
          alert("No active token found.");
          return;
      }
      const link = `${window.location.origin}/auth/signup?role=team_member&token=${member.token}`;
      setGeneratedLink(link);
      setSuccessEmail(member.email); 
      setShowInviteSuccess(true);
  };

  const sendInvite = async () => {
      if (!inviteEmail || !profile) return;
      setSendingInvite(true);

      // 1. Create Team Member Row
      const { data: newMember, error } = await supabase
          .from('team_members')
          .insert({
              researcher_id: profile.id,
              email: inviteEmail,
              role: inviteRole,
              status: 'invited'
          })
          .select()
          .single();

      if (error) {
          alert("Error: " + error.message);
          setSendingInvite(false);
          return;
      }

      // 2. Add Permissions if selected
      if (inviteClaims.length > 0) {
          const perms = inviteClaims.map(cid => ({
              team_member_id: newMember.id,
              claim_id: cid
          }));
          await supabase.from('claim_permissions').insert(perms);
      }

      // 3. Handle Success State
      const link = `${window.location.origin}/auth/signup?role=team_member&token=${newMember.token}`;
      setGeneratedLink(link);
      setSuccessEmail(inviteEmail); // Store this for the success message
      setTeamMembers([...teamMembers, newMember]);
      
      // 4. Close Invite Modal & Clear Form
      setIsInviteModalOpen(false);
      setInviteEmail(""); // Clear form for next time
      setInviteClaims([]);
      
      // 5. Open Success Modal
      setShowInviteSuccess(true);  
      setSendingInvite(false);
  };

  // ------------------------------------------------------------------
  // DELETE LOGIC
  // ------------------------------------------------------------------
  const confirmDelete = async () => {
      if (!memberToDelete) return;
      await supabase.from('team_members').delete().eq('id', memberToDelete);
      setTeamMembers(teamMembers.filter(m => m.id !== memberToDelete));
      setIsDeleteModalOpen(false);
  };

  // ------------------------------------------------------------------
  // ACCESS MANAGEMENT LOGIC
  // ------------------------------------------------------------------
  const openAccessModal = async (member: any) => {
      setSelectedMember(member);
      setAccessSearch("");
      setAccessFilter("all");

      const { data } = await supabase
          .from('claim_permissions')
          .select('claim_id')
          .eq('team_member_id', member.id);
      
      setTempSelectedTrials(data?.map((p: any) => String(p.claim_id)) || []);
      setIsAccessModalOpen(true);
  };

  const handleCheckboxChange = (claimId: string) => {
      const id = String(claimId);
      if (tempSelectedTrials.includes(id)) {
          setTempSelectedTrials(prev => prev.filter(i => i !== id));
      } else {
          setTempSelectedTrials(prev => [...prev, id]);
      }
  };

  // Bulk Select for Access Modal
  const handleBulkSelectAccess = (selectAll: boolean) => {
      const visibleIds = filteredAccessTrials.map(t => t.claim_id);
      if (selectAll) {
          const toAdd = visibleIds.filter(id => !tempSelectedTrials.includes(id));
          setTempSelectedTrials(prev => [...prev, ...toAdd]);
      } else {
          setTempSelectedTrials(prev => prev.filter(id => !visibleIds.includes(id)));
      }
  };

  const savePermissions = async () => {
      if (!selectedMember) return;
      setSavingPermissions(true);

      const { data: dbData } = await supabase
          .from('claim_permissions')
          .select('claim_id')
          .eq('team_member_id', selectedMember.id);
      
      const dbIds = dbData?.map((p: any) => String(p.claim_id)) || [];

      // Surgical Diff Logic
      const toAdd = tempSelectedTrials.filter(id => !dbIds.includes(id));
      const toRemove = dbIds.filter(id => !tempSelectedTrials.includes(id));

      try {
          if (toRemove.length > 0) {
              await supabase
                  .from('claim_permissions')
                  .delete()
                  .eq('team_member_id', selectedMember.id)
                  .in('claim_id', toRemove);
          }

          if (toAdd.length > 0) {
              await supabase
                  .from('claim_permissions')
                  .insert(toAdd.map(cid => ({
                      team_member_id: selectedMember.id,
                      claim_id: cid
                  })));
          }

          setIsAccessModalOpen(false);
          alert("Access saved successfully.");
      } catch (err: any) {
          alert("Error: " + err.message);
      } finally {
          setSavingPermissions(false);
      }
  };

  // ------------------------------------------------------------------
  // FILTERS
  // ------------------------------------------------------------------
  
  // Filter logic for Invite Modal
  const filteredInviteTrials = myTrials.filter(t => 
      t.title?.toLowerCase().includes(inviteSearch.toLowerCase()) || 
      t.nct_id?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
      t.site_location?.city?.toLowerCase().includes(inviteSearch.toLowerCase())
  );

  // Toggle All for Invite Modal
  const toggleSelectAllTrials = () => {
      const targetIds = filteredInviteTrials.map(t => t.claim_id);
      const allSelected = targetIds.every(id => inviteClaims.includes(id));
      
      if (allSelected) {
          setInviteClaims(prev => prev.filter(id => !targetIds.includes(id)));
      } else {
          const newSelection = [...inviteClaims];
          targetIds.forEach(id => { if (!newSelection.includes(id)) newSelection.push(id); });
          setInviteClaims(newSelection);
      }
  };

  // Filter logic for Access Modal
  const filteredAccessTrials = myTrials.filter(t => {
      const match = t.nct_id?.toLowerCase().includes(accessSearch.toLowerCase()) || 
                    t.title?.toLowerCase().includes(accessSearch.toLowerCase());
      if (!match) return false;
      if (accessFilter === 'assigned') return tempSelectedTrials.includes(t.claim_id);
      return true;
  });

  if (loading) {
      return (
          <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
      );
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <div className="p-8 animate-in fade-in duration-300">
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
            <p className="text-slate-500 text-sm mt-1">{profile?.company_name}</p>
          </div>
          <button 
            onClick={openInviteModal} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all hover:bg-indigo-700 transform hover:-translate-y-0.5"
          >
            <UserPlus className="h-4 w-4" /> 
            Invite Member
          </button>
        </header>

        {/* TEAM TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-700">{member.email}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                    member.role === 'sub_pi' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                    {member.role === 'sub_pi' ? 'Sub-PI' : member.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                {member.status === 'invited' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-500 font-bold flex items-center gap-1">
                                            <Clock className="h-3 w-3"/> Invited
                                        </span>
                                        <button 
                                            onClick={() => handleViewInvite(member)} 
                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors" 
                                            title="View Invite Link"
                                        >
                                            <LinkIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3"/> Active
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button 
                                    onClick={() => openAccessModal(member)} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-slate-200" 
                                    title="Manage Access"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => { setMemberToDelete(member.id); setIsDeleteModalOpen(true); }} 
                                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-slate-200" 
                                    title="Remove Member"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {teamMembers.length === 0 && (
                <div className="px-6 py-10 text-center text-slate-400 italic">
                    No team members yet. Invite someone above.
                </div>
            )}
        </div>

        {/* INVITE MODAL (RESTORED BEAUTIFUL UI) */}
        {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900">Invite Team Member</h3>
                        <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto flex-1 p-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                            {/* FIX: added new-password to prevent autofill persistence */}
                            <input 
                                type="email" 
                                autoComplete="new-password"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" 
                                placeholder="colleague@clinic.com" 
                                value={inviteEmail} 
                                onChange={e => setInviteEmail(e.target.value)} 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                            <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" 
                                value={inviteRole} 
                                onChange={e => setInviteRole(e.target.value)}
                            >
                                <option value="coordinator">Coordinator (Specific Studies)</option>
                                {/* FIX: Added Sub-PI Role */}
                                <option value="sub_pi">Sub-Principal Investigator (Sub-PI)</option>
                                <option value="admin">Admin (Full Access)</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {inviteRole === 'admin' ? "Admins can see all studies and billing." : 
                                 inviteRole === 'sub_pi' ? "Sub-PIs can edit studies but cannot see billing." :
                                 "Coordinators only see studies you select below."}
                            </p>
                        </div>
                        
                        {/* CONDITIONAL: ONLY SHOW TRIAL SELECTOR FOR COORDINATORS/SUB-PIS */}
                        {inviteRole !== 'admin' && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Assign Access</label>
                                    <button onClick={toggleSelectAllTrials} className="text-[10px] font-bold text-indigo-600 hover:underline">
                                        {inviteClaims.length > 0 && inviteClaims.length === filteredInviteTrials.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-2.5 h-3 w-3 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Filter studies..." 
                                        className="w-full pl-8 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500" 
                                        value={inviteSearch} 
                                        onChange={(e) => setInviteSearch(e.target.value)} 
                                    />
                                </div>
                                
                                <div className="border border-slate-200 rounded-xl p-2 max-h-64 overflow-y-auto bg-slate-50">
                                    {filteredInviteTrials.length > 0 ? filteredInviteTrials.map((t: any) => (
                                        <label key={t.claim_id} className="flex items-center gap-3 p-3 hover:bg-white rounded-lg transition-colors group cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" 
                                                checked={inviteClaims.includes(String(t.claim_id))} 
                                                onChange={(e) => { 
                                                    if (e.target.checked) setInviteClaims((prev: string[]) => [...prev, String(t.claim_id)]); 
                                                    else setInviteClaims((prev: string[]) => prev.filter(id => id !== String(t.claim_id))); 
                                                }} 
                                            />
                                            <div>
                                                <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-900">{t.title}</div>
                                                <div className="text-xs text-slate-400">{t.site_location?.city || "Remote"}</div>
                                            </div>
                                        </label>
                                    )) : <div className="text-xs text-slate-400 p-4 text-center italic">No matching studies found.</div>}
                                </div>
                                <div className="text-right mt-1 text-[10px] text-slate-400">{inviteClaims.length} selected</div>
                            </div>
                        )}
                        
                        <button 
                            onClick={sendInvite} 
                            disabled={sendingInvite || !inviteEmail} 
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {sendingInvite ? "Generating..." : "Generate Invite Link"} <LinkIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* SUCCESS MODAL */}
        {showInviteSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Member Invited!</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        Share this link with <strong>{successEmail}</strong> so they can join your team.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3 mb-4">
                        <div className="flex-1 font-mono text-xs text-slate-600 truncate">{generatedLink}</div>
                        <button 
                            onClick={() => { 
                                navigator.clipboard.writeText(generatedLink); 
                                setCopySuccess(true); 
                                setTimeout(() => setCopySuccess(false), 2000); 
                            }} 
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 transition-colors shadow-sm"
                        >
                            {copySuccess ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setShowInviteSuccess(false)} 
                            className="py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Done
                        </button>
                        <button 
                            onClick={() => window.open(`mailto:${successEmail}?subject=Invitation&body=${encodeURIComponent(generatedLink)}`)} 
                            className="py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2"
                        >
                            <Mail className="h-4 w-4" /> Draft Email
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ACCESS MODAL */}
        {isAccessModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-xl text-slate-900">Manage Study Access</h3>
                            <p className="text-sm text-slate-500 mt-1">{selectedMember?.email}</p>
                        </div>
                        <button onClick={() => setIsAccessModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="px-6 pt-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-blue-800 leading-relaxed">
                            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                            <div><strong>How it works:</strong> Check to grant access, uncheck to revoke. Changes save on <strong>"Save Changes"</strong>.</div>
                        </div>
                    </div>

                    <div className="px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setAccessFilter('all')} 
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${accessFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All Studies
                            </button>
                            <button 
                                onClick={() => setAccessFilter('assigned')} 
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${accessFilter === 'assigned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Assigned Only
                            </button>
                        </div>
                        <div className="relative flex-1 w-full sm:w-64">
                             <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                             <input 
                                 type="text" 
                                 placeholder="Search all studies..." 
                                 className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                 value={accessSearch} 
                                 onChange={(e) => setAccessSearch(e.target.value)} 
                             />
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-2 pt-0">
                        {filteredAccessTrials.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm italic">No studies found.</div> : filteredAccessTrials.map(t => {
                            const isChecked = tempSelectedTrials.includes(String(t.claim_id));
                            return (
                                <label 
                                    key={t.claim_id} 
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${isChecked ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                                        {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={isChecked} 
                                        onChange={() => handleCheckboxChange(String(t.claim_id))} 
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-900">{t.title}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{t.site_location?.city || "Remote"}</div>
                                    </div>
                                    {isChecked && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm animate-in zoom-in">
                                            Assigned
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                    <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsAccessModalOpen(false)} 
                            className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={savePermissions} 
                            disabled={savingPermissions} 
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-lg flex items-center gap-2 disabled:opacity-70 transition-all transform hover:-translate-y-0.5"
                        >
                            {savingPermissions && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* DELETE MODAL */}
        {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Member?</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        Immediate access loss. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)} 
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}