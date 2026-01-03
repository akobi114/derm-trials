"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, FileText, Printer, Globe, Edit3, UploadCloud, 
  Building2, Trash2, CheckCircle2, ExternalLink, ChevronRight, Info, Link as LinkIcon, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';

const SITE_DOMAIN = process.env.NODE_ENV === 'production' ? 'dermtrials.health' : 'localhost:3000';

export default function ResourcesPage() {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
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

        let { data: prof } = await supabase.from('researcher_profiles').select('organization_id').eq('user_id', user.id).maybeSingle();
        if (!prof) {
            const { data: tm } = await supabase.from('team_members').select('organization_id').eq('user_id', user.id).maybeSingle();
            if (tm) prof = tm;
        }

        if(prof?.organization_id) {
            const { data: orgData } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
            setOrganization(orgData);
            setTempSlug(orgData?.slug || "");

            const { data: claims } = await supabase.from('claimed_trials').select('*, trials(*)').eq('organization_id', prof.organization_id).eq('status', 'approved');
            if (claims) setMyTrials(claims.map(c => ({ ...c.trials, claim_id: c.id })));
        }
        setLoading(false);
    }
    fetchData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !organization) return;
    setUploadingLogo(true);
    try {
        const file = e.target.files[0];
        const fileName = `logos/org-${organization.id}-${Math.random()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('trial-assets').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('trial-assets').getPublicUrl(fileName);
        await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', organization.id);
        setOrganization({ ...organization, logo_url: publicUrl });
    } catch (err: any) { alert(err.message); } 
    finally { setUploadingLogo(false); }
  };

  const handleUpdateSlug = async () => {
    setUpdatingSlug(true);
    setError("");
    const clean = tempSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const { error } = await supabase.from('organizations').update({ slug: clean }).eq('id', organization.id);
    if(error) setError("Unavailable.");
    else { setOrganization({...organization, slug: clean}); setIsSlugModalOpen(false); }
    setUpdatingSlug(false);
  };

  if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <header className="mb-10"><h1 className="text-3xl font-black text-slate-900 uppercase">Patient Resources</h1></header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
                {/* BRANDING CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-6"><Globe className="h-5 w-5 text-indigo-600" /> Public Portal</h2>
                    {organization?.slug ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100"><p className="text-xs font-bold text-emerald-800">Link Active</p><p className="text-xs text-emerald-600 break-all">{SITE_DOMAIN}/{organization.slug}</p></div>
                            <button onClick={() => setIsSlugModalOpen(true)} className="w-full py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest">Edit Link</button>
                            <Link href={`/${organization.slug}`} target="_blank" className="block w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest text-center">Visit Page</Link>
                        </div>
                    ) : <button onClick={() => setIsSlugModalOpen(true)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Setup Link</button>}
                </div>

                {/* LOGO CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                    <div className="w-24 h-24 mx-auto bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 overflow-hidden relative group">
                        {organization?.logo_url ? <img src={organization.logo_url} className="w-full h-full object-contain p-2" /> : <UploadCloud className="h-8 w-8 text-slate-300" />}
                    </div>
                    <label className="cursor-pointer text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                        <input type="file" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                </div>
            </div>

            {/* FLYERS LIST */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50"><h2 className="font-bold text-slate-900 uppercase">Study Flyers ({myTrials.length})</h2></div>
                <div className="divide-y divide-slate-50">
                    {myTrials.map(t => (
                        <div key={t.claim_id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase">{t.nct_id}</div><div className="font-bold text-slate-900 text-sm">{t.title}</div></div>
                            <Link href={`/dashboard/researcher/print/${t.claim_id}`} className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 flex items-center gap-2"><Printer className="h-3 w-3" /> PDF</Link>
                        </div>
                    ))}
                    {myTrials.length === 0 && <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase">No active protocols</div>}
                </div>
            </div>
        </div>

        {/* SLUG MODAL */}
        {isSlugModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 w-full max-w-md">
                    <h3 className="font-black text-xl text-slate-900 mb-4">Set Web Address</h3>
                    <input type="text" className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none mb-2" value={tempSlug} onChange={e => setTempSlug(e.target.value)} placeholder="clinic-name" />
                    {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
                    <div className="flex gap-3">
                        <button onClick={() => setIsSlugModalOpen(false)} className="flex-1 py-3 border rounded-xl text-xs font-bold uppercase">Cancel</button>
                        <button onClick={handleUpdateSlug} disabled={updatingSlug} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase">{updatingSlug ? "Saving..." : "Save"}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}