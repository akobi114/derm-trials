"use client";

import React from 'react';
import { Mail, MapPin, Building2, Copy, ChevronRight, Calculator } from "lucide-react";
import { calculateTier, getContactStrategy } from "../utils";

interface LeadFeedProps {
    leads: any[];
    onViewLead: (lead: any) => void;
    onUpdateNote: (leadId: string, text: string) => void;
    generateEmailDraft: (lead: any, specificContact?: any) => void;
    savingNote: string | null;
}

export default function LeadFeed({ leads, onViewLead, onUpdateNote, generateEmailDraft, savingNote }: LeadFeedProps) {
    const pendingLeads = leads.filter((l: any) => !l.is_claimed);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-indigo-600" /> Outreach Queue
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                    {pendingLeads.length} Pending
                </span>
            </div>
            
            <div className="divide-y divide-slate-100">
                {pendingLeads.map((lead: any) => {
                    const tier = calculateTier(lead, lead.trial_questions);
                    const strategy = getContactStrategy(lead);
                    
                    return (
                        <div key={lead.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-6 group relative">
                            {/* COL 1: PATIENT & TRIAL */}
                            <div className="w-full md:w-[30%] space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-900 text-sm cursor-pointer hover:text-indigo-600 transition-colors" 
                                            onClick={() => onViewLead(lead)}>
                                            {lead.name}
                                        </h4>
                                        {tier && (
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${tier.style}`}>
                                                    {tier.label}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-1">{lead.trial_title}</div>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 w-fit rounded border border-slate-200">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-600">{lead.site_city}, {lead.site_state}</span>
                                </div>
                            </div>

                            {/* COL 2: CONTACT DOSSIER */}
                            <div className="w-full md:w-[35%] bg-slate-50/50 rounded-lg border border-slate-200 p-3">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-1">
                                    <Building2 className="h-3 w-3" /> Site Contact Data
                                </h5>
                                {strategy.facility && (
                                    <div className="text-xs font-bold text-slate-800 mb-1">{strategy.facility}</div>
                                )}
                                {strategy.localContacts.map((contact: any, i: number) => (
                                    <div key={i} className="flex justify-between items-start text-xs border-l-2 border-indigo-300 pl-2 mb-1">
                                        <div>
                                            <div className="font-bold text-slate-700">{contact.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{contact.email || contact.phone}</div>
                                        </div>
                                        {contact.email && (
                                            <button onClick={() => generateEmailDraft(lead, contact)} className="p-1 hover:bg-indigo-100 rounded text-indigo-600">
                                                <Copy className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* COL 3: OPS & NOTES */}
                            <div className="w-full md:w-[35%] flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Admin Log</span>
                                    {savingNote === lead.id && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Saving...</span>}
                                </div>
                                <textarea 
                                    defaultValue={lead.admin_notes || ""} 
                                    onBlur={(e) => onUpdateNote(lead.id, e.target.value)}
                                    className="flex-1 w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none resize-none min-h-[80px]"
                                    placeholder="Log outreach notes..."
                                />
                            </div>
                        </div>
                    );
                })}
                {pendingLeads.length === 0 && (
                    <div className="p-20 text-center text-slate-400 italic">No pending leads in queue.</div>
                )}
            </div>
        </div>
    );
}