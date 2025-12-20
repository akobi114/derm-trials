"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, FileText, Printer, Globe, Save, Info, X, 
  ExternalLink, CheckCircle2, ChevronRight, AlertCircle, 
  Link as LinkIcon, Edit3, UploadCloud, Building2, Trash2
} from 'lucide-react';
import Link from 'next/link';

const SITE_DOMAIN = process.env.NODE_ENV === 'production' ? 'dermtrials.health' : 'localhost:3000';

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [isSlugModalOpen, setIsSlugModalOpen] = useState(false);
  const [tempSlug, setTempSlug] = useState("");
  const [updatingSlug, setUpdatingSlug] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const { data: prof } = await supabase.from('researcher_profiles').select('*').eq('user_id', user.id).single();
        if(prof) {
            setProfile(prof);
            setTempSlug(prof.slug || "");
            const { data: claims } = await supabase.from('claimed_trials').select('*, trials(*)').eq('researcher_id', prof.id).eq('status', 'approved');
            if (claims) {
                setMyTrials(claims.map(c => ({ ...c.trials, claim_id: c.id, custom_summary: c.custom_brief_summary })));
            }
        }
        setLoading(false);
    }
    fetchData();
  }, []);

  // --- LOGO UPLOAD HANDLER ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingLogo(true);
    
    try {
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `logos/${profile.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('trial-assets')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('trial-assets')
            .getPublicUrl(fileName);

        const { error: updateError } = await supabase
            .from('researcher_profiles')
            .update({ logo_url: publicUrl })
            .eq('id', profile.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, logo_url: publicUrl });
    } catch (err: any) {
        alert("Upload failed: " + err.message);
    } finally {
        setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!confirm("Remove organization logo?")) return;
    await supabase.from('researcher_profiles').update({ logo_url: null }).eq('id', profile.id);
    setProfile({ ...profile, logo_url: null });
  };

  const formatSlug = (val: string) => val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

  const handleUpdateSlug = async () => {
    setUpdatingSlug(true);
    setError("");
    const cleanSlug = formatSlug(tempSlug);
    if (cleanSlug.length < 3) { setError("Please enter at least 3 characters."); setUpdatingSlug(false); return; }
    const { error: supabaseError } = await supabase.from('researcher_profiles').update({ slug: cleanSlug }).eq('id', profile.id);
    if(supabaseError) { setError("This address is already in use by another group."); } 
    else { setProfile({...profile, slug: cleanSlug}); setIsSlugModalOpen(false); }
    setUpdatingSlug(false);
  };

  if(loading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Resources</h1>
                <p className="text-slate-500 mt-2 font-medium">Recruitment materials and public trial listings for your organization.</p>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
                {/* 1. GROUP WEB ADDRESS */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Globe className="h-5 w-5 text-indigo-600" />
                            Group Web Address
                        </h2>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            This creates a single, professional page that lists <strong>all your active trials</strong> in one place. It is the best link to share on your main clinic website.
                        </p>
                        
                        {profile?.slug ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Your Link is Live</p>
                                        <p className="text-xs text-emerald-700 font-medium break-all mt-0.5">{SITE_DOMAIN}/{profile.slug}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSlugModalOpen(true)}
                                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="h-4 w-4" /> Change Web Address
                                </button>
                                <Link 
                                    href={`/${profile.slug}`} 
                                    target="_blank"
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                    Visit Public Portal <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsSlugModalOpen(true)}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                Setup Your Web Address <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. PRO TIP Area */}
                <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" /> Pro Tip
                    </h3>
                    <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                        Individual trial flyers are listed to the right. Use the "Group Address" above for general clinical branding, and use individual flyers for specific social media ads or lobby posters.
                    </p>
                </div>

                {/* 3. ORGANIZATION BRANDING (NEW SECTION BELOW PRO TIP) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Organization Logo
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col items-center">
                            <div className="relative group w-32 h-32 mb-6">
                                <div className="w-full h-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                    {profile?.logo_url ? (
                                        <img src={profile.logo_url} alt="Org Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <UploadCloud className="h-10 w-10 text-slate-300" />
                                    )}
                                </div>
                                {profile?.logo_url && (
                                    <button onClick={removeLogo} className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full text-rose-500 shadow-sm hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <label className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                {profile?.logo_url ? "Update Logo" : "Upload Logo"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            </label>
                            <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
                                Recommended: Square PNG or JPG. <br/> Appears on your public portal and flyers.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLYERS SECTION */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-900">Printable Study Flyers</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{myTrials.length} Studies Active</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {myTrials.length > 0 ? myTrials.map((trial) => (
                            <div key={trial.claim_id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                                <div className="max-w-[70%]">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{trial.nct_id}</div>
                                    <h4 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{trial.title}</h4>
                                </div>
                                <Link 
                                    href={`/dashboard/researcher/print/${trial.claim_id}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    <Printer className="h-4 w-4" /> Generate Flyer
                                </Link>
                            </div>
                        )) : (
                            <div className="p-20 text-center">
                                <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium italic">No approved studies found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* WEB ADDRESS MODAL */}
        {isSlugModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative overflow-hidden">
                    <button onClick={() => setIsSlugModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 p-2"><X className="h-6 w-6" /></button>
                    <div className="mb-8"><h3 className="font-black text-2xl text-slate-900 tracking-tight mb-2">Claim Your Web Address</h3><p className="text-slate-500 text-sm leading-relaxed">Create a simple link that patients can use to find all the studies currently active at your site.</p></div>
                    <div className="bg-slate-100 rounded-2xl p-1 mb-8 border border-slate-200 shadow-inner">
                        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                            <div className="flex gap-1.5 shrink-0"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div></div>
                            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 flex items-center gap-2 truncate"><LinkIcon className="h-3 w-3" />{SITE_DOMAIN}/<span className="text-indigo-600 font-bold">{formatSlug(tempSlug) || 'address'}</span></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Your Research Group Name</label>
                            <input type="text" className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-lg transition-all ${error ? 'border-red-200 focus:border-red-400' : 'border-slate-100 focus:border-indigo-500'}`} placeholder="e.g. Phoenix Research Group" value={tempSlug} onChange={(e) => setTempSlug(e.target.value)} />
                            {error && <p className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2 px-1"><AlertCircle className="h-4 w-4" /> {error}</p>}
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsSlugModalOpen(false)} className="flex-1 py-5 border-2 border-slate-100 bg-white rounded-2xl font-black text-sm text-slate-400 hover:bg-slate-50 uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={handleUpdateSlug} disabled={updatingSlug || !tempSlug} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                {updatingSlug ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Address"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}