"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, MapPin, CheckCircle2, Smartphone, Printer, 
  ArrowLeft, Clock, Pill, Scale, Info, Save, Edit3, Users, Shield, FileDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

const SITE_DOMAIN = process.env.NODE_ENV === 'production' ? 'https://dermtrials.health' : 'http://localhost:3000';

export default function StudyFlyer() {
  const params = useParams();
  const flyerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // INDEPENDENT STATES: Prevents input locking
  const [intro, setIntro] = useState("");
  const [treatment, setTreatment] = useState("");
  const [frequency, setFrequency] = useState("");
  const [placebo, setPlacebo] = useState("");
  const [whoCanJoin, setWhoCanJoin] = useState("");
  const [benefits, setBenefits] = useState("");

  useEffect(() => {
    async function fetchFlyerData() {
      if (!params?.claim_id) return;
      const { data: claimData } = await supabase
        .from('claimed_trials')
        .select(`*, trials (*), researcher_profiles:researcher_id (*)`)
        .eq('id', params.claim_id)
        .single();

      if (claimData) {
        setData(claimData);
        const ov = claimData.flyer_overrides || {};
        setIntro(ov.intro || claimData.trials?.simple_summary || "");
        setTreatment(ov.treatment || "");
        setFrequency(ov.frequency || "");
        setPlacebo(ov.placebo || "");
        setWhoCanJoin(ov.whoCanJoin || "");
        setBenefits(ov.benefits || "TRAVEL REIMBURSEMENT\nCLINICAL MONITORING\nSTIPEND PROVIDED\nMEDICATION AT NO COST");
      }
      setLoading(false);
    }
    fetchFlyerData();
  }, [params?.claim_id]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { intro, treatment, frequency, placebo, whoCanJoin, benefits };
    await supabase.from('claimed_trials').update({ flyer_overrides: payload }).eq('id', params.claim_id);
    setIsEditing(false);
    setSaving(false);
  };

  if (loading || !data) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-100 p-0 md:p-10 flex flex-col items-center">
      
      {/* 1. RESTORED DUAL CONTROLS (Hidden during print) */}
      <div className="w-full max-w-[8.5in] p-6 mb-4 flex justify-between items-center print:hidden">
        <Link href="/dashboard/researcher/documents" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-transform active:scale-95">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
              {/* Both buttons trigger the native high-fidelity print dialog */}
              <button onClick={() => window.print()} className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2 transition-transform active:scale-95">
                <FileDown className="h-4 w-4" /> Download PDF
              </button>
              <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                <Printer className="h-5 w-5" /> Print Flyer
              </button>
            </>
          ) : (
            <button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white px-10 py-2.5 rounded-xl font-black shadow-lg flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save Changes
            </button>
          )}
        </div>
      </div>

      {/* 2. THE FLYER CONTENT: VECTOR-OPTIMIZED */}
      <div ref={flyerRef} id="flyer-content" className="bg-white w-[8.5in] h-[11in] flex flex-col relative font-sans text-slate-900 overflow-hidden shadow-2xl print:shadow-none print:m-0">
        
        {/* HEADER: Smaller Brand / Big Impact */}
        <div className="bg-[#4f46e5] px-12 py-8 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            {data.researcher_profiles?.logo_url ? (
                <img src={data.researcher_profiles.logo_url} className="h-16 w-auto object-contain" alt="Logo" />
            ) : (
                <div className="p-3 bg-white/20 rounded-xl text-white font-black text-3xl">{data.researcher_profiles?.company_name?.charAt(0)}</div>
            )}
            <div className="border-l border-white/20 pl-6 py-1">
              <h2 className="text-2xl font-black tracking-tight leading-none mb-1.5">{data.researcher_profiles?.company_name}</h2>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> 
                {(data.site_city || "PHOENIX").toUpperCase()}, {(data.site_state || "AZ").toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right leading-tight">
            <div className="text-indigo-200 text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-80">Clinical Network</div>
            <div className="text-white font-black text-xl tracking-tight leading-none">DermTrials.health</div>
          </div>
        </div>

        <div className="flex-1 px-14 py-5 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 border border-indigo-100">Now Recruiting Participants</span>
            <h1 className="text-[22px] font-black leading-[1.2] tracking-tight text-slate-900">{data.trials.simple_title || data.trials.title}</h1>
          </div>

          <div className="grid grid-cols-5 gap-8 flex-1 min-h-0">
            <div className="col-span-3 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm print:shadow-none">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2 flex items-center gap-2"><Info className="h-4 w-4 opacity-50" /> Study Overview</h3>
                {isEditing ? (
                  <textarea className="w-full p-2 text-[11px] border-2 border-indigo-50 rounded-lg bg-indigo-50/30 relative z-50 cursor-text min-h-[70px]" value={intro} onChange={(e) => setIntro(e.target.value)} />
                ) : (
                  <p className="text-slate-600 text-[11px] leading-relaxed font-medium italic">"{intro}"</p>
                )}
              </div>

              <div className="space-y-2">
                {[
                    { state: treatment, setter: setTreatment, label: 'Treatment', icon: <Pill className="h-4 w-4" /> },
                    { state: frequency, setter: setFrequency, label: 'Frequency', icon: <Clock className="h-4 w-4" /> },
                    { state: placebo, setter: setPlacebo, label: 'Placebo Control', icon: <Scale className="h-4 w-4" /> }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-[#4f46e5] shrink-0">{item.icon}</div>
                        <div className="w-full">
                            <h4 className="font-bold text-slate-900 text-xs mb-1 uppercase tracking-tighter opacity-80">{item.label}</h4>
                            {isEditing ? (
                                <textarea className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[11px] leading-tight relative z-50 cursor-text" value={item.state} onChange={(e) => item.setter(e.target.value)} />
                            ) : (
                                <p className="text-[11px] text-slate-500 leading-relaxed">{item.state || "Details pending..."}</p>
                            )}
                        </div>
                    </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="bg-[#0f172a] p-5 rounded-[1.5rem] text-white">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Who Can Join?</h3>
                {isEditing ? (
                    <textarea className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-[11px] min-h-[90px] relative z-50 cursor-text" value={whoCanJoin} onChange={(e) => setWhoCanJoin(e.target.value)} />
                ) : (
                    <p className="text-[11px] leading-relaxed text-slate-100">{whoCanJoin || "Criteria to be added."}</p>
                )}
                <div className="border-t border-white/10 mt-3 pt-3 space-y-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-white"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> <span className="flex-1 leading-none">No insurance required.</span></div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-white"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> <span className="flex-1 leading-none">Study care at no cost.</span></div>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] bg-slate-50/50">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 text-center">Participant Benefits</h4>
                {isEditing ? (
                   <textarea className="w-full bg-white border border-slate-200 rounded p-2 text-[11px] min-h-[70px] relative z-50 cursor-text" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
                ) : (
                  <div className="space-y-2">
                    {benefits.split('\n').filter(Boolean).map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 
                        <span className="text-[10px] font-bold text-slate-600 uppercase flex-1 leading-tight">{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="max-w-[60%]">
                <h2 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Check eligibility instantly.</h2>
                <p className="text-slate-500 text-[10px] font-medium mb-3 leading-relaxed opacity-80">Scan with your smartphone camera to see if you qualify to join. No obligation required.</p>
                <div className="text-[12px] font-bold text-[#4f46e5] underline decoration-2 underline-offset-4 tracking-tighter">dermtrials.health/{data.researcher_profiles?.slug}</div>
            </div>
            <div className="flex flex-col items-center gap-2 mr-6">
                <div className="bg-white p-2 border-2 border-[#4f46e5] rounded-[1rem] shadow-md print:shadow-none">
                    <QRCodeSVG value={`${SITE_DOMAIN}/screener/${data.trials.nct_id}?claim_id=${data.id}`} size={100} level="H" />
                </div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Smartphone className="h-3 w-3 text-indigo-500" /> Scan to Qualify</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-14 py-3 text-center border-t border-slate-100 text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] shrink-0 flex items-center justify-center gap-2">
            <Shield className="h-3 w-3 opacity-30" /> Professional Research Standards • Privacy Protected • © 2025
        </div>
      </div>

      {/* 3. PRINT ENGINE: VECTOR-ONLY MODE */}
      <style jsx global>{`
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          
          /* Hide all Dashboard UI */
          nav, aside, footer, header, .print\\:hidden, [class*="sidebar"], [class*="navbar"] { 
            display: none !important; 
            height: 0 !important;
            width: 0 !important;
          }

          /* Lock Flyer to Top-Left and Kill Blur (Shadows) */
          #flyer-content { 
            position: fixed !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 8.5in !important; 
            height: 11in !important; 
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important; /* Critical: Shadows trigger blurry rasterization */
            border: none !important;
            z-index: 9999 !important;
          }

          /* Force browser to 0 margins to prevent page spill */
          @page { 
            size: 8.5in 11in; 
            margin: 0 !important; 
          }

          /* Force vector-sharp text rendering */
          * { 
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
          }
        }
      `}</style>
    </div>
  );
}