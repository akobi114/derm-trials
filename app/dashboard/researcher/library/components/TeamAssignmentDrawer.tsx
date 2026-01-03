"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Loader2, Stethoscope, Check, ChevronDown } from 'lucide-react';

interface TeamAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trial: any; 
  roster: any[];
  currentAssignments: any[];
  orgId: string | null;
  onSave: () => void;
}

export default function TeamAssignmentDrawer({ 
  isOpen, onClose, trial, roster, currentAssignments, orgId, onSave 
}: TeamAssignmentDrawerProps) {
  
  // Map of MemberID -> Role
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && trial) {
      const initialMap: Record<string, string> = {};
      currentAssignments.forEach(a => {
          initialMap[a.team_member_id] = a.role_on_trial || 'Sub-Investigator';
      });
      setAssignments(initialMap);
    }
  }, [isOpen, trial, currentAssignments]);

  if (!isOpen || !trial) return null;

  const toggleSelection = (memberId: string) => {
    setAssignments(prev => {
        const newMap = { ...prev };
        if (newMap[memberId]) {
            delete newMap[memberId]; // Deselect
        } else {
            newMap[memberId] = 'Sub-Investigator'; // Default Select
        }
        return newMap;
    });
  };

  const updateRole = (memberId: string, newRole: string) => {
      setAssignments(prev => ({ ...prev, [memberId]: newRole }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const nctId = trial.nct_id;

    // 1. Clear existing for this trial/org
    await supabase.from('trial_assignments').delete().eq('trial_id', nctId).eq('organization_id', orgId);

    // 2. Insert new
    const memberIds = Object.keys(assignments);
    if (memberIds.length > 0) {
        const payload = memberIds.map(memberId => ({
            organization_id: orgId,
            trial_id: nctId,
            team_member_id: memberId,
            role_on_trial: assignments[memberId]
        }));
        await supabase.from('trial_assignments').insert(payload);
    }

    setSaving(false);
    onSave(); 
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
        <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50">
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assign Team</h2>
                    <p className="text-slate-500 text-xs font-bold mt-1 max-w-[250px] truncate">{trial.trials?.official_title}</p>
                </div>
                <button onClick={onClose}><X className="h-6 w-6 text-slate-400 hover:text-slate-900" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Investigators</p>
                
                {roster.length === 0 && (
                    <div className="p-4 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-100">
                        No investigators found. Add them in the 'Team' tab first.
                    </div>
                )}

                {roster.map(member => {
                    const isSelected = !!assignments[member.id];
                    const role = assignments[member.id];

                    return (
                        <div key={member.id} className={`p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleSelection(member.id)}>
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {isSelected ? <Check className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                        {member.first_name} {member.last_name}
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium">{member.email}</p>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="mt-4 pt-3 border-t border-indigo-100/50">
                                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Role on Study</label>
                                    <div className="relative">
                                        <select 
                                            value={role}
                                            onChange={(e) => updateRole(member.id, e.target.value)}
                                            className="w-full bg-white border border-indigo-200 text-indigo-900 text-xs font-bold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                        >
                                            <option value="Principal Investigator">Principal Investigator (PI)</option>
                                            <option value="Sub-Investigator">Sub-Investigator (Sub-I)</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-indigo-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white safe-area-bottom">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Assignments</>}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}