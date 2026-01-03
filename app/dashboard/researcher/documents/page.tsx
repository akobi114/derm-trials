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
  const [organization, setOrganization] = useState<any>(null); // New state for Org branding
  const [myTrials, setMyTrials] = useState<any[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [isSlugModalOpen, setIsSlugModalOpen] = useState(false);
  const [tempSlug, setTempSlug] = useState("");
  const [updatingSlug, setUpdatingSlug] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return;

            // 1. Fetch Profile bare (Decoupled fetch to prevent join errors)
            let { data: prof, error: profError } = await supabase
                .from('researcher_profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            // Fallback: If not found in primary profiles, check if they are a team member
            if (!prof) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('*, researcher_profiles(*)')
                    .eq('user_id', user.id)
                    .maybeSingle();
                prof = memberData?.researcher_profiles;
            }

            if(prof) {
                setProfile(prof);
                const orgId = prof.organization_id;
                
                if (orgId) {
                    // 2. Fetch Organization Data separately (Reliability Fix)
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', orgId)
                        .maybeSingle();

                    if (orgData) {
                        setOrganization(orgData);
                        setTempSlug(orgData.slug || "");

                        // 3. Fetch ALL approved trials for the entire ORGANIZATION
                        const { data: claims } = await supabase
                            .from('claimed_trials')
                            .select('*, trials(*)')
                            .eq('organization_id', orgId)
                            .eq('status', 'approved');

                        if (claims) {
                            setMyTrials(claims.map(c => ({ 
                                ...c.trials, 
                                claim_id: c.id, 
                                custom_summary: c.custom_brief_summary 
                            })));
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Fatal error in documents fetch:", err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  // --- LOGO UPLOAD HANDLER (Targeting Organizations) ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !organization) return;
    setUploadingLogo(true);
    
    try {
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        // Use organization ID for the path
        const fileName = `logos/org-${organization.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('trial-assets')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('trial-assets')
            .getPublicUrl(fileName);

        // Update the Organization table instead of profile
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_url: publicUrl })
            .eq('id', organization.id);

        if (updateError) throw updateError;

        setOrganization({ ...organization, logo_url: publicUrl });
    } catch (err: any) {
        alert("Upload failed: " + err.message);
    } finally {
        setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!confirm("Remove organization logo?") || !organization) return;
    await supabase.from('organizations').update({ logo_url: null }).eq('id', organization.id);
    setOrganization({ ...organization, logo_url: null });
  };

  const formatSlug = (val: string) => val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

  const handleUpdateSlug = async () => {
    if (!organization) return;
    setUpdatingSlug(true);
    setError("");
    const cleanSlug = formatSlug(tempSlug);
    
    if (cleanSlug.length < 3) { 
        setError("Please enter at least 3 characters."); 
        setUpdatingSlug(false); 
        return; 
    }

    // Update the Organization table instead of profile
    const { error: supabaseError } = await supabase
        .from('organizations')
        .update({ slug: cleanSlug })
        .eq('id', organization.id);

    if(supabaseError) { 
        setError("This address is already in use by another group."); 
    } else { 
        setOrganization({...organization, slug: cleanSlug}); 
        setIsSlugModalOpen(false); 
    }
    setUpdatingSlug(false);
  };

  if(loading) return <div className="h-full flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Patient Resources</h1>
                <p className="text-slate-500 mt-2 font-medium">Recruitment materials and public trial listings for {organization?.name || 'your organization'}.</p>
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
                            This creates a single, professional page that lists <strong>all your clinic's active trials</strong> in one place.
                        </p>
                        
                        {organization?.slug ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Your Link is Live</p>
                                        <p className="text-xs text-emerald-700 font-medium break-all mt-0.5">{SITE_DOMAIN}/{organization.slug}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSlugModalOpen(true)}
                                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="h-4 w-4" /> Change Web Address
                                </button>
                                <Link 
                                    href={`/${organization.slug}`} 
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
                        Individual trial flyers are listed to the right. Your organization page (above) automatically stays updated as your PIs add or remove trials.
                    </p>
                </div>

                {/* 3. ORGANIZATION BRANDING */}
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
                                    {organization?.logo_url ? (
                                        <img src={organization.logo_url} alt="Org Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <UploadCloud className="h-10 w-10 text-slate-300" />
                                    )}
                                </div>
                                {organization?.logo_url && (
                                    <button onClick={removeLogo} className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full text-rose-500 shadow-sm hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <label className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                {organization?.logo_url ? "Update Logo" : "Upload Logo"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            </label>
                            <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed font-bold uppercase tracking-widest">
                                PNG or JPG <br/> Applied to entire site
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLYERS SECTION */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-900 uppercase tracking-tight">Clinic-Wide Active Trials</h2>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest">{myTrials.length} APPROVED</span>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    <Printer className="h-4 w-4" /> Generate Flyer
                                </Link>
                            </div>
                        )) : (
                            <div className="p-20 text-center">
                                <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium italic">No organization trials approved yet.</p>
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
                    <div className="mb-8"><h3 className="font-black text-2xl text-slate-900 tracking-tight mb-2 uppercase">Clinic Web Address</h3><p className="text-slate-500 text-sm leading-relaxed">Create a unified link for patients to browse all trials active at this facility.</p></div>
                    <div className="bg-slate-100 rounded-2xl p-1 mb-8 border border-slate-200 shadow-inner">
                        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                            <div className="flex gap-1.5 shrink-0"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div></div>
                            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 flex items-center gap-2 truncate"><LinkIcon className="h-3 w-3" />{SITE_DOMAIN}/<span className="text-indigo-600 font-bold">{formatSlug(tempSlug) || 'address'}</span></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Clinic or Group Name</label>
                            <input type="text" className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-lg transition-all ${error ? 'border-red-200 focus:border-red-400' : 'border-slate-100 focus:border-indigo-500'}`} placeholder="e.g. Phoenix Dermatology" value={tempSlug} onChange={(e) => setTempSlug(e.target.value)} />
                            {error && <p className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2 px-1"><AlertCircle className="h-4 w-4" /> {error}</p>}
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsSlugModalOpen(false)} className="flex-1 py-5 border-2 border-slate-100 bg-white rounded-2xl font-black text-[10px] text-slate-400 hover:bg-slate-50 uppercase tracking-widest transition-all">Cancel</button>
                            <button handleUpdateSlug={handleUpdateSlug} disabled={updatingSlug || !tempSlug} onClick={handleUpdateSlug} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                {updatingSlug ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Site Link"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}