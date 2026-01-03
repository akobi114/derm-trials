"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Building2, ChevronUp, ChevronDown, User, ShieldAlert, Mail, 
  Phone, Eye, FlaskConical, MapPin, ExternalLink, X, CheckCircle, ShieldCheck,
  UserCircle, Users, Stethoscope
} from 'lucide-react';

export default function ResearcherApprovals({ 
  researcherList, 
  expandedId, 
  setExpandedId, 
  viewDocument, 
  rejectResearcher, 
  verifyResearcher 
}: any) {
  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Institutional Approvals</h2>
          <p className="text-slate-500 text-sm font-medium">Verify clinical trial sites and their associated medical personnel.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {researcherList.length === 0 ? (
            <div className="p-20 text-center text-slate-400">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="text-xs font-black uppercase tracking-widest">No pending applications</p>
            </div>
          ) : (
            researcherList.map((group: any) => {
              const { organization, oam, investigators, trials, assignments } = group;
              
              // Safety guard for broken data structure
              if (!group) return null;

              // Use the group ID (Org UUID or virtual 'unlinked' string) for expansion
              const isExpanded = expandedId === group.id;

              return (
                <div key={group.id} className={`group transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                  {/* --- CARD HEADER --- */}
                  <div 
                    className="p-8 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-2xl transition-all ${isExpanded ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase leading-none mb-2">
                          {organization?.name || "Broken/Unlinked Record"}
                        </h4>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                                <UserCircle className="h-4 w-4" /> 
                                {oam?.full_name || "Account Manager Missing"}
                            </div>
                            <div className="text-slate-300">|</div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                <Phone className="h-3 w-3" /> 
                                {oam?.phone_number || "No Phone Provided"}
                            </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Data</div>
                            <div className="text-xs font-bold text-slate-700 uppercase">
                                {investigators.length + (oam ? 1 : 0)} Medical Staff • {trials.length} Protocols
                            </div>
                        </div>
                        <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300'}`}>
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                    </div>
                  </div>

                  {/* --- EXPANDED VIEW: ROSTER & MAPPING --- */}
                  {isExpanded && (
                    <div className="px-8 pb-8 pl-[104px] animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* 1. INSTITUTION ROSTER */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-indigo-600" /> Medical Personnel
                                </h5>
                                <div className="space-y-3">
                                    {oam && (
                                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-indigo-900">{oam.full_name}</div>
                                                <div className="text-[10px] text-indigo-400 font-mono">{oam.email}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {oam.verification_doc_path && (
                                                    <button onClick={() => viewDocument(oam.verification_doc_path)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-indigo-100 transition-all">
                                                        <Eye size={14} />
                                                    </button>
                                                )}
                                                <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter">OAM / Admin</span>
                                            </div>
                                        </div>
                                    )}
                                    {investigators.map((inv: any) => (
                                        <div key={inv.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">{inv.full_name || "Invite Pending"}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{inv.email}</div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{inv.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. PROTOCOL & ASSIGNMENT MATRIX */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-indigo-600" /> Active Protocol Mapping
                                </h5>
                                <div className="space-y-3">
                                    {trials.map((t: any) => {
                                        // Filter assignments specifically for this trial and this organization
                                        const assignedTo = assignments?.filter((a: any) => a.trial_id === t.nct_id);
                                        return (
                                            <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t.nct_id}</span>
                                                    <Link href={`/trial/${t.nct_id}`} target="_blank">
                                                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 hover:text-indigo-600 transition-colors" />
                                                    </Link>
                                                </div>
                                                <div className="text-xs font-bold text-slate-900 mb-3 line-clamp-1">{t.trials?.title || "Protocol Title Unavailable"}</div>
                                                
                                                <div className="flex flex-wrap gap-1">
                                                    {assignedTo && assignedTo.length > 0 ? assignedTo.map((a: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                                                            <Stethoscope className="h-2.5 w-2.5 text-slate-400" />
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                                                {a.team_members?.first_name || a.team_members?.email}
                                                            </span>
                                                        </div>
                                                    )) : (
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase italic">No staff assigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {trials.length === 0 && (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                            <FlaskConical className="h-8 w-8 text-slate-100 mx-auto mb-2" />
                                            <p className="text-[10px] font-bold text-slate-300 uppercase">No trials selected</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ACTION BAR */}
                        <div className="mt-8 flex gap-4">
                            <button 
                                onClick={() => rejectResearcher(organization?.id || null)} 
                                className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
                            >
                                Reject Application
                            </button>
                            <button 
                                onClick={() => verifyResearcher(organization?.id || null)} 
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <ShieldCheck className="h-5 w-5" /> Activate Institution & Team
                            </button>
                        </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}