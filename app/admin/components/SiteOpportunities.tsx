"use client";

import React from 'react';
import { Activity, MapPin, Users, Eye, Building2 } from "lucide-react";

interface SiteOpportunitiesProps {
    opportunities: any[];
    onEnterGodMode: (opp: any) => void;
    onUpdateSiteNote: (oppId: string, nctId: string, city: string, state: string, text: string) => void;
    savingSiteNote: string | null;
}

export default function SiteOpportunities({ opportunities, onEnterGodMode, onUpdateSiteNote, savingSiteNote }: SiteOpportunitiesProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                    <Activity className="h-5 w-5" /> Sales Targets
                </h3>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                    {opportunities.length} Unclaimed Sites
                </span>
            </div>
            
            <div className="divide-y divide-slate-100">
                {opportunities.map((opp: any) => (
                    <div key={opp.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-6 group">
                        {/* COL 1: SITE INFO */}
                        <div className="w-full md:w-[30%] space-y-3">
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{opp.title}</h4>
                                <div className="text-xs text-slate-500 font-mono mt-1">{opp.nct_id}</div>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 w-fit rounded border border-slate-200">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="text-xs font-bold text-slate-600">{opp.city}, {opp.state}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                                <Users className="h-4 w-4 text-emerald-600" />
                                <span className="text-lg font-bold text-emerald-700">{opp.count} Leads Waiting</span>
                            </div>
                        </div>

                        {/* COL 2: FACILITY DETAIL */}
                        <div className="w-full md:w-[35%] bg-slate-50/50 rounded-lg border border-slate-200 p-3">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> Identified Facility
                            </h5>
                            <div className="text-xs font-bold text-slate-800">{opp.facility || "Multiple Facilities Detected"}</div>
                            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic">
                                Grouped by geographic proximity to study locations.
                            </p>
                        </div>

                        {/* COL 3: ACTIONS & PERSISTENT LOG */}
                        <div className="w-full md:w-[35%] flex flex-col justify-between">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Site Outreach Log</span>
                                    {savingSiteNote === opp.id && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Saving...</span>}
                                </div>
                                <textarea 
                                    defaultValue={opp.admin_note || ""} 
                                    onBlur={(e) => onUpdateSiteNote(opp.id, opp.nct_id, opp.city, opp.state, e.target.value)}
                                    className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none resize-none min-h-[60px]"
                                    placeholder="Log site contact history..."
                                />
                            </div>
                            <button 
                                onClick={() => onEnterGodMode({ ...opp, id: 'virtual' })} 
                                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm"
                            >
                                <Eye className="h-3 w-3" /> Audit All {opp.count} Leads
                            </button>
                        </div>
                    </div>
                ))}
                {opportunities.length === 0 && (
                    <div className="p-20 text-center text-slate-400 italic">No unclaimed opportunities available.</div>
                )}
            </div>
        </div>
    );
}