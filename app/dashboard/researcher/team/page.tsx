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
  Crown, 
  Mail, 
  Copy, 
  CheckCheck, 
  ShieldCheck,
  RefreshCw,
  Archive,
  Stethoscope,
  ClipboardList,
  Shield // <--- ADDED THIS IMPORT
} from 'lucide-react';

export default function TeamManagement() {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [profile, setProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'active' | 'archived'>('active');

  // --- MODAL STATES ---
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Updated Invite State (Split Name)
  const [inviteData, setInviteData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    role: 'Clinical Investigator' 
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [successEmail, setSuccessEmail] = useState(""); 
  const [copySuccess, setCopySuccess] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedMemberForStatus, setSelectedMemberForStatus] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // --- 1. DATA FETCHING ---
  const fetchTeamData = useCallback(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);
        
        // Fetch Current User's Profile
        let { data: profileData } = await supabase
            .from('team_members')
            .select('*, organizations(*)')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (!profileData) {
             // Fallback for OAMs who might just have a profile but no team entry
             const { data: p } = await supabase.from('researcher_profiles').select('*').eq('user_id', user.id).single();
             if (p) profileData = { ...p, is_oam: true }; 
        }
        
        setProfile(profileData);

        if (profileData?.organization_id) {
            const { data: teamRes } = await supabase
                .from('team_members')
                .select('*')
                .eq('organization_id', profileData.organization_id)
                .order('is_oam', { ascending: false })
                .order('created_at', { ascending: false });

            setTeamMembers(teamRes || []);
        }
    } catch (err) {
        console.error("Team Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // --- 2. INVITE LOGIC ---
  const openInviteModal = () => {
      setInviteData({ firstName: '', lastName: '', email: '', role: 'Clinical Investigator' });
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
      if (!inviteData.email || !inviteData.firstName || !profile?.organization_id) return;
      setSendingInvite(true);

      try {
        // A. CREATE GHOST PROFILE (Fixes "null value in column researcher_id" error)
        // This reserves the name/email so the user can claim it later
        const { data: newProfile, error: profileError } = await supabase
            .from('researcher_profiles')
            .insert({
                organization_id: profile.organization_id,
                first_name: inviteData.firstName,
                last_name: inviteData.lastName,
                full_name: `${inviteData.firstName} ${inviteData.lastName}`,
                email: inviteData.email.trim().toLowerCase(),
                role: inviteData.role,
                status: 'invited',
                is_verified: false
            })
            .select('id')
            .single();

        if (profileError) throw new Error("Profile Creation Error: " + profileError.message);

        // B. CREATE TEAM MEMBER
        const { data: newMember, error: memberError } = await supabase
            .from('team_members')
            .insert({
                organization_id: profile.organization_id,
                researcher_id: newProfile.id, // Linked!
                first_name: inviteData.firstName,
                last_name: inviteData.lastName,
                email: inviteData.email.trim().toLowerCase(),
                role: inviteData.role,
                status: 'invited',
                is_active: true,
                is_oam: false 
            })
            .select()
            .single();

        if (memberError) throw new Error("Team Member Error: " + memberError.message);

        const link = `${window.location.origin}/auth/signup?role=team_member&token=${newMember.token}`;
        setGeneratedLink(link);
        setSuccessEmail(inviteData.email); 
        
        setTeamMembers(prev => [newMember, ...prev]);
        setIsInviteModalOpen(false);
        setShowInviteSuccess(true);  

      } catch (err: any) {
          alert(err.message);
      } finally {
          setSendingInvite(false);
      }
  };

  // --- 3. ARCHIVE LOGIC (OAM ONLY) ---
  const toggleMemberActiveStatus = async () => {
      if (!selectedMemberForStatus) return;
      if (!profile?.is_oam) {
          alert("Security Restriction: Only the Account Manager can archive staff.");
          return;
      }
      
      if (selectedMemberForStatus.is_oam) {
          alert("You cannot archive yourself. Please transfer ownership first in Settings.");
          setIsStatusModalOpen(false);
          return;
      }

      setIsUpdatingStatus(true);
      const newActiveState = !selectedMemberForStatus.is_active;

      const { error } = await supabase
          .from('team_members')
          .update({ is_active: newActiveState })
          .eq('id', selectedMemberForStatus.id);

      if (!error) {
          setTeamMembers(prev => prev.map(m => 
              m.id === selectedMemberForStatus.id ? { ...m, is_active: newActiveState } : m
          ));
          setIsStatusModalOpen(false);
      } else {
          alert("Failed: " + error.message);
      }
      setIsUpdatingStatus(false);
  };

  // --- 4. ROLE CHANGE ---
  const changeMemberRole = async (memberId: string, newRole: string) => {
    if (!profile?.is_oam) return;

    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));

    await supabase.from('team_members').update({ role: newRole }).eq('id', memberId);
    
    // Sync Profile too
    const memberEmail = teamMembers.find(m => m.id === memberId)?.email;
    if (memberEmail) {
        await supabase
            .from('researcher_profiles')
            .update({ role: newRole })
            .eq('organization_id', profile.organization_id)
            .eq('email', memberEmail);
    }
  };

  const displayedMembers = teamMembers.filter(m => 
    viewFilter === 'active' ? m.is_active : !m.is_active
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500 bg-slate-50 min-h-screen">
        
        {/* HEADER */}
        <header className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-900 text-white rounded-lg"><Users className="h-5 w-5" /></div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Research Team</h1>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              {profile?.organizations?.name || "Organization Roster"}
            </p>
          </div>
          
          <div className="flex gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
                  <button onClick={() => setViewFilter('active')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewFilter === 'active' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
                  <button onClick={() => setViewFilter('archived')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewFilter === 'archived' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Archived</button>
              </div>

              <button 
                onClick={openInviteModal} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                <UserPlus className="h-4 w-4" /> 
                Add Member
              </button>
          </div>
        </header>

        {/* ROSTER TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-6">Staff Member</th>
                        <th className="px-8 py-6">System Role</th>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                    {displayedMembers.map((member) => (
                        <tr key={member.id} className={`hover:bg-slate-50/80 transition-colors group ${!member.is_active ? 'opacity-50 grayscale' : ''}`}>
                            
                            {/* NAME / EMAIL COLUMN */}
                            <td className="px-8 py-6">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm">
                                            {member.first_name ? `${member.first_name} ${member.last_name}` : member.email}
                                        </span>
                                        {member.is_oam && (
                                            <div className="bg-amber-100 text-amber-700 p-1 rounded-full" title="Organization Account Manager">
                                                <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{member.email}</span>
                                </div>
                            </td>

                            {/* ROLE COLUMN */}
                            <td className="px-8 py-6">
                                <div className="relative w-fit">
                                    <select 
                                        value={member.role}
                                        onChange={(e) => changeMemberRole(member.id, e.target.value)}
                                        disabled={!profile?.is_oam || member.is_oam || !member.is_active}
                                        className={`appearance-none bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-lg pl-8 pr-4 py-2 outline-none transition-all cursor-pointer ${profile?.is_oam && !member.is_oam ? 'hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500' : 'opacity-70 cursor-not-allowed'}`}
                                    >
                                        <option value="Clinical Coordinator">Clinical Coordinator</option>
                                        <option value="Clinical Investigator">Clinical Investigator</option>
                                    </select>
                                    <div className="absolute left-2.5 top-2 pointer-events-none text-slate-400">
                                        {member.role === 'Clinical Investigator' ? <Stethoscope className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                                    </div>
                                </div>
                            </td>

                            {/* STATUS COLUMN */}
                            <td className="px-8 py-6">
                                {member.status === 'invited' ? (
                                    <button onClick={() => handleViewInvite(member)} className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors">
                                        <Clock className="h-3 w-3"/> Pending Invite
                                    </button>
                                ) : member.is_active ? (
                                    <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        <CheckCircle2 className="h-3 w-3"/> Active
                                    </span>
                                ) : (
                                    <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                        <Archive className="h-3 w-3"/> Archived
                                    </span>
                                )}
                            </td>

                            {/* ACTIONS COLUMN */}
                            <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    {profile?.is_oam && !member.is_oam && (
                                        <button 
                                            onClick={() => { setSelectedMemberForStatus(member); setIsStatusModalOpen(true); }} 
                                            className={`p-2.5 rounded-xl transition-all border border-transparent shadow-sm ${
                                                member.is_active ? 'text-slate-400 hover:text-rose-500 hover:bg-white hover:border-slate-200' : 'text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100'
                                            }`} 
                                            title={member.is_active ? "Archive User" : "Restore User"}
                                        >
                                            {member.is_active ? <Trash2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {displayedMembers.length === 0 && (
                <div className="px-8 py-24 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Users className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No staff members found.</p>
                </div>
            )}
        </div>

        {/* --- PREMIUM INVITE MODAL --- */}
        {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900">Invite New Member</h2>
                        <button onClick={() => setIsInviteModalOpen(false)}><X className="h-6 w-6 text-slate-400 hover:text-slate-900" /></button>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                                    placeholder="Jane"
                                    value={inviteData.firstName}
                                    onChange={e => setInviteData({...inviteData, firstName: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                                    placeholder="Doe"
                                    value={inviteData.lastName}
                                    onChange={e => setInviteData({...inviteData, lastName: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Email</label>
                            <input 
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                                placeholder="jane@clinic.com"
                                value={inviteData.email}
                                onChange={e => setInviteData({...inviteData, email: e.target.value})}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setInviteData({...inviteData, role: 'Clinical Investigator'})}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${inviteData.role === 'Clinical Investigator' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    <Stethoscope className="h-6 w-6" />
                                    <span className="text-[10px] font-black uppercase">Investigator</span>
                                </button>
                                <button 
                                    onClick={() => setInviteData({...inviteData, role: 'Clinical Coordinator'})}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${inviteData.role === 'Clinical Coordinator' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    <Shield className="h-6 w-6" />
                                    <span className="text-[10px] font-black uppercase">Coordinator</span>
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={sendInvite}
                            disabled={sendingInvite || !inviteData.email || !inviteData.firstName}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {sendingInvite ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Secure Invite'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* SUCCESS MODAL */}
        {showInviteSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[3rem] p-12 w-full max-w-lg shadow-2xl text-center border border-slate-100">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <ShieldCheck className="h-12 w-12" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Invite Ready</h3>
                    <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed">
                        Secure token generated for <span className="text-slate-900 font-bold">{successEmail}</span>.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center gap-4 mb-10 shadow-inner">
                        <div className="flex-1 font-mono text-[10px] font-bold text-slate-400 truncate text-left">{generatedLink}</div>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(generatedLink); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }} 
                            className="p-3 bg-white border border-slate-200 rounded-2xl hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                        >
                            {copySuccess ? <CheckCheck className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => window.open(`mailto:${successEmail}?subject=DermTrials Invite&body=Join our team: ${encodeURIComponent(generatedLink)}`)} 
                            className="py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                            <Mail className="h-4 w-4" /> Send Email
                        </button>
                        <button onClick={() => setShowInviteSuccess(false)} className="py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">Close</button>
                    </div>
                </div>
            </div>
        )}

        {/* STATUS TOGGLE MODAL */}
        {isStatusModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white rounded-[3rem] p-12 w-full max-w-md shadow-2xl text-center border border-slate-100">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm ${selectedMemberForStatus?.is_active ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        {selectedMemberForStatus?.is_active ? <Trash2 className="h-10 w-10" /> : <RefreshCw className="h-10 w-10" />}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">
                        {selectedMemberForStatus?.is_active ? 'Archive Staff?' : 'Restore Staff?'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed px-4">
                        {selectedMemberForStatus?.is_active 
                            ? 'They will lose access to the dashboard immediately.' 
                            : 'They will regain access to their assigned protocols.'}
                    </p>
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={toggleMemberActiveStatus} 
                            disabled={isUpdatingStatus}
                            className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                selectedMemberForStatus?.is_active ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedMemberForStatus?.is_active ? 'Confirm Archive' : 'Restore Access')}
                        </button>
                        <button onClick={() => setIsStatusModalOpen(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}