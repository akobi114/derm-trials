"use client";

import React from 'react';
import { MessageCircle, Check, User, Mail, CheckCircle } from 'lucide-react';

export default function SupportInbox({ tickets, resolveTicket, refresh }: any) {
    const formatCategory = (cat: string) => {
        switch(cat) {
            case 'missing_trial': return 'Trial Not Found';
            case 'claim_dispute': return 'Claim Dispute';
            case '404_error': return 'Broken Link / 404';
            default: return 'Support Request';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-amber-600" /> Support Tickets
                    </h3>
                    <button onClick={refresh} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                        Refresh
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {tickets.length === 0 ? (
                        <div className="p-20 text-center text-slate-400">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No open tickets.</p>
                        </div>
                    ) : (
                        tickets.map((ticket: any) => (
                            <div key={ticket.id} className={`p-6 hover:bg-slate-50 transition-all ${ticket.status === 'resolved' ? 'opacity-50 grayscale' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${ticket.category === 'claim_dispute' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {formatCategory(ticket.category)}
                                            </span>
                                            <span className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleString()}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900">{ticket.subject}</h4>
                                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{ticket.message}"</p>
                                    </div>
                                    {ticket.status === 'open' && (
                                        <button onClick={() => resolveTicket(ticket.id)} className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-50 shadow-sm flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Resolve
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-1 font-bold"><User className="h-3 w-3" /> {ticket.researcher_name}</div>
                                    <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {ticket.researcher_email}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}