"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, Search, Loader2, LayoutList } from 'lucide-react';

// Components
import ProtocolList from './components/ProtocolList';
import DiscoveryOverlay from './components/DiscoveryOverlay';
import TeamAssignmentDrawer from './components/TeamAssignmentDrawer';

export default function ProtocolLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(""); 
  const [isOAM, setIsOAM] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState(""); 
  
  // Data State
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]); 
  const [assignments, setAssignments] = useState<any[]>([]);

  // UI State
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [selectedTrialForDrawer, setSelectedTrialForDrawer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- DATA FETCHING ---
  useEffect(() => {
    async function loadLibrary() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('team_members')
        .select('role, is_oam, organization_id, organizations(name)')
        .eq('user_id', user.id)
        .single();

      if (member) {
        setUserRole(member.role);
        setIsOAM(member.is_oam);
        setOrgId(member.organization_id);
        if (member.organizations) setOrgName(member.organizations.name);

        if (member.organization_id) {
          await refreshLibrary(member.organization_id);
        }
      }
      setLoading(false);
    }
    loadLibrary();
  }, []);

  // UPDATED: Return data for immediate use
  const refreshLibrary = async (targetOrgId: string) => {
    const { data: claims } = await supabase
      .from('claimed_trials')
      .select('*, trials(*), site_location')
      .eq('organization_id', targetOrgId)
      .order('created_at', { ascending: false });

    const { data: team } = await supabase
      .from('team_members')
      .select('*')
      .eq('organization_id', targetOrgId)
      .eq('is_active', true);

    const { data: asgs } = await supabase
      .from('trial_assignments')
      .select('*')
      .eq('organization_id', targetOrgId);

    setPortfolio(claims || []);
    setRoster(team || []);
    setAssignments(asgs || []);
    
    return claims || [];
  };

  // --- WORKFLOW: CLAIM -> ASSIGN ---
  const handleTrialAdded = async (nctId: string) => {
      if (!orgId) return;
      setIsDiscoveryOpen(false); // Close Search
      
      // Refresh Data
      const newPortfolio = await refreshLibrary(orgId);
      
      // Find the new trial and open the assignment drawer immediately
      const newTrial = newPortfolio.find((t: any) => t.nct_id === nctId);
      if (newTrial) {
          setSelectedTrialForDrawer(newTrial);
      }
  };

  const canEdit = userRole === 'Clinical Coordinator' || isOAM;

  const filteredPortfolio = useMemo(() => {
    return portfolio.filter(p => 
      p.trials?.official_title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.nct_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [portfolio, searchQuery]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Protocol Library</h1>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-12">
            {portfolio.length} Active Studies • {roster.length} Investigators
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by NCT or keyword..." 
              className="w-full pl-10 p-2.5 bg-slate-100 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {canEdit && (
            <button 
              onClick={() => setIsDiscoveryOpen(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Study
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {filteredPortfolio.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white">
            <LayoutList className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-slate-900 font-black uppercase tracking-tight">Library Empty</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">No protocols found matching your criteria.</p>
          </div>
        ) : (
          <ProtocolList 
            trials={filteredPortfolio}
            assignments={assignments}
            roster={roster}
            canEdit={canEdit}
            onManageTeam={(trial) => setSelectedTrialForDrawer(trial)}
          />
        )}
      </div>

      <DiscoveryOverlay 
        isOpen={isDiscoveryOpen} 
        onClose={() => setIsDiscoveryOpen(false)}
        orgId={orgId}
        orgName={orgName}
        existingNctIds={portfolio.map(p => p.nct_id)}
        onTrialAdded={handleTrialAdded}
      />

      <TeamAssignmentDrawer 
        isOpen={!!selectedTrialForDrawer}
        onClose={() => setSelectedTrialForDrawer(null)}
        trial={selectedTrialForDrawer}
        roster={roster}
        currentAssignments={assignments.filter(a => a.trial_id === selectedTrialForDrawer?.nct_id)}
        orgId={orgId}
        onSave={() => {
            if(orgId) refreshLibrary(orgId);
            setSelectedTrialForDrawer(null);
        }}
      />

    </div>
  );
}