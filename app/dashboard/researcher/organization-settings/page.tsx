"use client";

import { useState } from 'react';
import { ShieldCheck, CreditCard, History, Building2 } from 'lucide-react';

// We import the existing logic to keep this file clean.
// Since we moved this file, we need to adjust the import paths slightly 
// to go up one more level if your components are in sibling folders.
// Assuming your folder structure is flat under 'researcher':
import OrganizationPage from '../Organization/page'; 
import BillingPage from '../billing/page'; 

export default function OAMSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'audit'>('general');

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* OAM SETTINGS HEADER */}
      <div className="bg-white border-b border-slate-200 px-10 py-8">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">OAM Settings</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium ml-14">
            Institutional controls for the Organization Account Manager.
        </p>
        
        <div className="flex gap-1 mt-8 ml-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Building2 className="h-4 w-4" /> General
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`px-6 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'billing' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <CreditCard className="h-4 w-4" /> Billing & Credits
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <History className="h-4 w-4" /> Audit Log
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="p-0">
        
        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <OrganizationPage />
            </div>
        )}

        {/* TAB 2: BILLING */}
        {activeTab === 'billing' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <BillingPage />
            </div>
        )}

        {/* TAB 3: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="p-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 p-20 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Global Audit Trail</h3>
                <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">
                    This security module will track all sensitive changes (PI assignments, staff removal, billing updates) across your organization.
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}