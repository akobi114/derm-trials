"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Lock, Mail, Phone, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Only Personal Fields
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [security, setSecurity] = useState({ current: '', newPass: '', confirm: '' });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      
      const { data: profile } = await supabase.from('researcher_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (profile) {
        setFormData({
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            phone: profile.phone_number || '',
            email: user.email || ''
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const handleUpdate = async () => {
    setSaving(true);
    setMessage(null);
    try {
        await supabase.from('researcher_profiles').update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone_number: formData.phone
        }).eq('user_id', user.id);
        
        // Update Team Member record too for consistency
        await supabase.from('team_members').update({
            first_name: formData.firstName,
            last_name: formData.lastName
        }).eq('user_id', user.id);

        if (formData.email !== user.email) {
            const { error } = await supabase.auth.updateUser({ email: formData.email });
            if (error) throw error;
            setMessage({ type: 'success', text: "Email confirmation sent." });
        } else {
            setMessage({ type: 'success', text: "Profile updated." });
        }
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
    setSaving(false);
  };

  const handlePassword = async () => {
    if (security.newPass !== security.confirm) return setMessage({ type: 'error', text: "Passwords do not match" });
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: security.newPass });
    if (error) setMessage({ type: 'error', text: error.message });
    else {
        setMessage({ type: 'success', text: "Password changed." });
        setSecurity({ current: '', newPass: '', confirm: '' });
    }
    setSaving(false);
  };

  if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-500">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-10">My Profile</h1>
        
        {message && (
            <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                {message.text}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* PERSONAL INFO */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-slate-100 rounded-lg"><User className="h-5 w-5 text-slate-500" /></div>
                    <h3 className="font-bold text-slate-900 uppercase tracking-wide text-sm">Personal Details</h3>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">First Name</label><input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Last Name</label><input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Email</label><input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label><input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                    <button onClick={handleUpdate} disabled={saving} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all mt-4">{saving ? "Saving..." : "Save Profile"}</button>
                </div>
            </div>

            {/* SECURITY */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg"><ShieldCheck className="h-5 w-5 text-indigo-600" /></div>
                    <h3 className="font-bold text-slate-900 uppercase tracking-wide text-sm">Security</h3>
                </div>
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label><input type="password" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={security.newPass} onChange={e => setSecurity({...security, newPass: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Confirm Password</label><input type="password" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={security.confirm} onChange={e => setSecurity({...security, confirm: e.target.value})} /></div>
                    <button onClick={handlePassword} disabled={saving || !security.newPass} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all mt-4">Update Password</button>
                </div>
            </div>
        </div>
    </div>
  );
}