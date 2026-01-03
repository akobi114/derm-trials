"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Building2, Globe, ShieldCheck, Upload, Save, 
  Loader2, Link2, FileText, MapPin, 
  CheckCircle2, AlertTriangle, ArrowRightLeft, Lock,
  ShieldAlert
} from 'lucide-react';

export default function OrganizationPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false); // New state for logo
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [org, setOrg] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. SECURITY GATE & DATA LOAD ---
  useEffect(() => {
    async function loadOrgAndCheckAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is the OAM (Organization Account Manager)
      const { data: teamMember, error: teamErr } = await supabase
        .from('team_members')
        .select('organization_id, is_oam')
        .eq('user_id', user.id)
        .single();

      if (teamErr || !teamMember?.is_oam) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', teamMember.organization_id)
        .single();
        
      setOrg(orgData);
      setLoading(false);
    }
    loadOrgAndCheckAccess();
  }, [router]);

  // --- 2. LOGO UPLOAD HANDLER ---
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setUploadingLogo(true);
    setMessage(null);

    try {
      // 1. Upload to Supabase Storage
      // Naming convention: org_id/timestamp_filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${org.id}/${Date.now()}.${fileExt}`;
      const bucketName = 'organization-assets'; // Ensure this bucket exists in Supabase Storage

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // 3. Update Organization Record in DB
      const { error: dbError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', org.id);

      if (dbError) throw dbError;

      // 4. Update Local State
      setOrg({ ...org, logo_url: publicUrl });
      setMessage({ type: 'success', text: 'Logo uploaded and updated successfully.' });

    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload logo. Please try again.' });
    } finally {
      setUploadingLogo(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- 3. GENERAL UPDATE HANDLER ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: org.name,
          bio_content: org.bio_content,
          slug: org.slug?.toLowerCase().replace(/\s+/g, '-'),
          address_line_1: org.address_line_1,
          city: org.city,
          state: org.state,
          zip_code: org.zip_code
        })
        .eq('id', org.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Organization profile updated successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
    </div>
  );

  // --- ACCESS DENIED UI ---
  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
      <p className="text-slate-500 mt-2 max-w-sm">
        Only the <strong>Organization Account Manager</strong> is authorized to manage institutional branding and settings.
      </p>
      <button 
        onClick={() => router.back()}
        className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all"
      >
        Go Back
      </button>
    </div>
  );

  return (
    <div className="p-4 lg:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 pb-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-tighter uppercase">Admin Console</span>
             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Settings</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Organization</h1>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-2xl border border-indigo-100 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Site Director Authority</span>
        </div>
      </div>

      {message && (
        <div className={`p-5 rounded-3xl border flex items-center gap-4 animate-in zoom-in-95 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT COLUMN: BRANDING */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-indigo-600" /> Identity
                </h2>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Name</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                            value={org.name || ''}
                            onChange={e => setOrg({...org, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Bio</label>
                        <textarea 
                            rows={5}
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none resize-none leading-relaxed"
                            placeholder="Describe your site's history and clinical expertise..."
                            value={org.bio_content || ''}
                            onChange={e => setOrg({...org, bio_content: e.target.value})}
                        />
                    </div>
                </div>
            </section>

            <section className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-indigo-600" /> Location Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                            value={org.address_line_1 || ''}
                            onChange={e => setOrg({...org, address_line_1: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                            value={org.city || ''}
                            onChange={e => setOrg({...org, city: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                            <input 
                                type="text" 
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-center"
                                value={org.state || ''}
                                onChange={e => setOrg({...org, state: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip Code</label>
                            <input 
                                type="text" 
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-center"
                                value={org.zip_code || ''}
                                onChange={e => setOrg({...org, zip_code: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: PORTAL & LOGO */}
        <div className="space-y-8">
            <section className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Globe className="h-5 w-5 text-indigo-400" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Public Web Slug</h3>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-4">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Portal Address</p>
                        <div className="flex items-center gap-1 text-xs text-white font-bold truncate">
                            <span className="opacity-40">dermtrials.health/</span>
                            <input 
                                className="bg-transparent border-none outline-none text-indigo-400 w-full"
                                value={org.slug || ''}
                                onChange={e => setOrg({...org, slug: e.target.value})}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        This slug creates your unique patient-facing portal. Use only letters, numbers, and hyphens.
                    </p>
                </div>
            </section>

            {/* LOGO UPLOAD SECTION (UPDATED) */}
            <section className="bg-white border border-slate-100 rounded-[3rem] p-8 flex flex-col items-center text-center shadow-sm">
                
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />

                <div 
                  onClick={handleLogoClick}
                  className={`w-32 h-32 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-slate-200 group overflow-hidden cursor-pointer relative transition-all hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 ${uploadingLogo ? 'pointer-events-none opacity-80' : ''}`}
                >
                   {uploadingLogo ? (
                     <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                   ) : org.logo_url ? (
                        <img src={org.logo_url} alt="Clinic Logo" className="w-full h-full object-contain p-2" />
                   ) : (
                        <Upload className="h-8 w-8 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                   )}
                </div>
                
                <button 
                  type="button" 
                  onClick={handleLogoClick}
                  disabled={uploadingLogo}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                >
                  {uploadingLogo ? 'Uploading...' : 'Update Logo'}
                </button>
            </section>

            <section className="bg-red-50/50 border border-red-100 rounded-[3rem] p-8 text-center">
                <ArrowRightLeft className="h-6 w-6 text-red-500 mx-auto mb-3" />
                <h4 className="text-xs font-black text-red-900 uppercase tracking-widest mb-2">Nominate Successor</h4>
                <p className="text-[10px] text-red-700 font-medium mb-6 leading-relaxed">
                    Transfer OAM privileges to another team member.
                </p>
                <button type="button" className="w-full py-3 bg-white border border-red-200 rounded-xl text-[9px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 transition-all">
                    Start Transfer
                </button>
            </section>
        </div>

        {/* FLOATING ACTION BAR */}
        <div className="fixed bottom-10 left-0 right-0 lg:left-[auto] lg:right-10 flex justify-center z-50">
            <button 
                type="submit" 
                disabled={saving}
                className="bg-slate-900 text-white px-12 py-5 rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-indigo-600 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
            >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Sync Global Profile</>}
            </button>
        </div>

      </form>
    </div>
  );
}