"use client";

import React from 'react';
import { Eye } from "lucide-react";

export default function ActiveSitesTable({ activeSites, onEnterGodMode }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Trial Info</th>
                            <th className="px-6 py-4">Researcher</th>
                            <th className="px-6 py-4">Status Breakdown</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeSites.map((claim: any) => (
                            <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{claim.trials?.title}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">
                                        {claim.nct_id} • {claim.site_location?.city}, {claim.site_location?.state}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{claim.researcher_profiles?.company_name}</div>
                                    <div className="text-xs text-slate-500">{claim.researcher_profiles?.full_name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
                                        <div className="flex flex-col items-center"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.new}</span><span className="text-slate-400">New</span></div>
                                        <div className="w-px h-6 bg-slate-200"></div>
                                        <div className="flex flex-col items-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.screening}</span><span className="text-slate-400">Screen</span></div>
                                        <div className="w-px h-6 bg-slate-200"></div>
                                        <div className="flex flex-col items-center"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.scheduled}</span><span className="text-slate-400">Sched</span></div>
                                        <div className="w-px h-6 bg-slate-200"></div>
                                        <div className="flex flex-col items-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md mb-1">{claim.stats.enrolled}</span><span className="text-slate-400">Enroll</span></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-slate-900">{claim.stats.total}</span>
                                        <span className="text-xs text-slate-400">Leads</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => onEnterGodMode(claim)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all">
                                        <Eye className="h-3 w-3" /> God Mode
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {activeSites.length === 0 && <div className="p-20 text-center text-slate-400 italic font-bold uppercase tracking-widest">No Active Claims Found</div>}
        </div>
    );
}