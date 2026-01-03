"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, Mail, 
  Stethoscope, ShieldCheck, ChevronRight,
  Info, CheckCircle2, UserCircle
} from 'lucide-react';

interface Investigator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Principal Investigator' | 'Sub-Investigator';
  isOAM?: boolean;
}

interface RosterProps {
  oamInfo: { firstName: string; lastName: string; email: string; isInvestigator: boolean };
  onComplete: (roster: Investigator[]) => void;
  onBack: () => void;
}

export default function InvestigatorRoster({ oamInfo, onComplete, onBack }: RosterProps) {
  const [roster, setRoster] = useState<Investigator[]>([]);
  const [newInv, setNewInv] = useState({ firstName: '', lastName: '', email: '', role: 'Principal Investigator' as any });

  // --- INITIALIZE: Add OAM if they checked the 'I am an investigator' box ---
  useEffect(() => {
    if (oamInfo.isInvestigator) {
      setRoster([{
        id: 'oam-id',
        firstName: oamInfo.firstName,
        lastName: oamInfo.lastName,
        email: oamInfo.email,
        role: 'Principal Investigator',
        isOAM: true
      }]);
    }
  }, [oamInfo]);

  const addInvestigator = () => {
    if (!newInv.firstName || !newInv.email) return;
    const entry: Investigator = {
      id: Math.random().toString(36).substr(2, 9),
      ...newInv
    };
    setRoster([...roster, entry]);
    setNewInv({ firstName: '', lastName: '', email: '', role: 'Principal Investigator' });
  };

  const removeInvestigator = (id: string) => {
    setRoster(roster.filter(i => i.id !== id));
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Stage 03</h3>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Medical Team</h2>
        <p className="text-slate-500 mt-2 font-medium">Add the investigators who will provide oversight for your trials.</p>
      </div>

      {/* --- ADD NEW INVESTIGATOR FORM --- */}
      <div className="bg-slate-900 rounded-[2rem] p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
            <UserPlus className="h-20 w-20 text-white" />
        </div>
        
        <div className="relative z-10 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
              <input 
                type="text" 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 outline-none text-white font-bold transition-all placeholder:text-slate-600" 
                placeholder="Dr. Sarah" 
                value={newInv.firstName} 
                onChange={e => setNewInv({...newInv, firstName: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
              <input 
                type="text" 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 outline-none text-white font-bold transition-all placeholder:text-slate-600" 
                placeholder="Smith" 
                value={newInv.lastName} 
                onChange={e => setNewInv({...newInv, lastName: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Email</label>
              <input 
                type="email" 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 outline-none text-white font-bold transition-all placeholder:text-slate-600" 
                placeholder="sarah@clinic.com" 
                value={newInv.email} 
                onChange={e => setNewInv({...newInv, email: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Role</label>
              <select 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 outline-none text-white font-bold transition-all appearance-none cursor-pointer"
                value={newInv.role}
                onChange={e => setNewInv({...newInv, role: e.target.value as any})}
              >
                <option value="Principal Investigator" className="bg-slate-900 text-white">Principal Investigator (PI)</option>
                <option value="Sub-Investigator" className="bg-slate-900 text-white">Sub-Investigator (Sub-PI)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={addInvestigator} 
            disabled={!newInv.firstName || !newInv.email}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="h-4 w-4" /> Add to Roster
          </button>
        </div>
      </div>

      {/* --- CURRENT ROSTER LIST --- */}
      <div className="space-y-4 mb-10">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="h-3 w-3" /> Active Site Roster ({roster.length})
        </h4>
        
        {roster.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                <Stethoscope className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No investigators added yet</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-3">
                {roster.map((inv) => (
                    <div key={inv.id} className="group p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all animate-in zoom-in-95">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inv.isOAM ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                                {inv.isOAM ? <ShieldCheck className="h-6 w-6" /> : <UserCircle className="h-6 w-6" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Dr. {inv.firstName} {inv.lastName}</p>
                                    {inv.isOAM && <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">Account Lead</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Mail className="h-3 w-3" /> {inv.email}</div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                    <div className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest">{inv.role}</div>
                                </div>
                            </div>
                        </div>
                        {!inv.isOAM && (
                            <button onClick={() => removeInvestigator(inv.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4 mb-10 shadow-sm">
        <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed font-medium">
            You must add at least <strong>one Principal Investigator</strong> to continue. You can add coordinators and additional support staff once your account is verified.
        </p>
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
            Go Back
        </button>
        <button 
            onClick={() => onComplete(roster)} 
            disabled={roster.length === 0}
            className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95"
        >
            Next: Select Your Trials <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}