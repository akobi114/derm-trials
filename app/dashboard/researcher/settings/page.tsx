"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, LayoutDashboard, Settings, LogOut, CreditCard, 
  User, Building2, Lock, Save, Mail, Phone, ShieldCheck, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function ResearcherSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    role: '',
    npiNumber: '',
    phone: '',
    email: ''
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);

    const { data: profile } = await supabase
      .from('researcher_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setProfile(profile);
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        companyName: profile.company_name || '',
        role: profile.role || '',
        npiNumber: profile.npi_number || '',
        phone: profile.phone_number || '', 
        email: user.email || '' 
      });
    }
    setLoading(false);
  }

  // --- ACTIONS ---

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // 1. Update Public Profile Table
      const { error } = await supabase
        .from('researcher_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`,
          company_name: formData.companyName,
          role: formData.role,
          npi_number: formData.npiNumber,
          phone_number: formData.phone
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Update Email (If changed)
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: formData.email });
        if (emailError) throw emailError;
        setMessage({ type: 'success', text: 'Profile saved! Please check your new email to confirm the change.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
      }

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // 1. Validate Inputs
    if (!securityData.currentPassword) {
        setMessage({ type: 'error', text: "Please enter your current password to verify your identity." });
        setSaving(false);
        return;
    }
    if (securityData.newPassword !== securityData.confirmPassword) {
        setMessage({ type: 'error', text: "New passwords do not match." });
        setSaving(false);
        return;
    }
    if (securityData.newPassword.length < 8) {
        setMessage({ type: 'error', text: "New password must be at least 8 characters." });
        setSaving(false);
        return;
    }

    try {
        // 2. Verify Old Password (by re-authenticating)
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: securityData.currentPassword
        });

        if (signInError) {
            throw new Error("Incorrect current password.");
        }

        // 3. Update to New Password
        const { error: updateError } = await supabase.auth.updateUser({ 
            password: securityData.newPassword 
        });

        if (updateError) throw updateError;

        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Clear inputs

    } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
    } finally {
        setSaving(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 h-20 flex items-center border-b border-slate-100">
          <Link href="/" className="font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
            Derm<span className="text-indigo-600">Trials</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/researcher" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <LayoutDashboard className="h-5 w-5" /> Overview
          </Link>
          <Link href="/dashboard/researcher/billing" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <CreditCard className="h-5 w-5" /> Billing & Invoices
          </Link>
          <Link href="/dashboard/researcher/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm bg-indigo-50 text-indigo-700">
            <Settings className="h-5 w-5" /> Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm w-full transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Account Settings</h1>

        {/* TABS */}
        <div className="flex border-b border-slate-200 mb-8">
            <button onClick={() => setActiveTab('profile')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <User className="h-4 w-4" /> Profile & Organization
            </button>
            <button onClick={() => setActiveTab('security')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'security' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <ShieldCheck className="h-4 w-4" /> Login & Security
            </button>
        </div>

        {/* NOTIFICATIONS AREA */}
        {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                {message.text}
            </div>
        )}

        {/* TAB 1: PROFILE FORM */}
        {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">First Name</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Last Name</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organization Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <input type="text" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Job Title / Role</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">NPI Number</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.npiNumber} onChange={e => setFormData({...formData, npiNumber: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input type="email" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Changing this requires email confirmation.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input type="text" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* TAB 2: SECURITY FORM */}
        {activeTab === 'security' && (
            <div className="max-w-xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3 border border-indigo-100">
                        <Lock className="h-5 w-5 text-indigo-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900">Secure your account</h4>
                            <p className="text-xs text-indigo-700 mt-1">For your security, please confirm your current password.</p>
                        </div>
                    </div>

                    {/* CURRENT PASSWORD */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Password</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={securityData.currentPassword} 
                            onChange={e => setSecurityData({...securityData, currentPassword: e.target.value})} 
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">New Password</label>
                        <input type="password" placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={securityData.newPassword} onChange={e => setSecurityData({...securityData, newPassword: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirm New Password</label>
                        <input type="password" placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={securityData.confirmPassword} onChange={e => setSecurityData({...securityData, confirmPassword: e.target.value})} />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Password
                        </button>
                    </div>
                </form>
            </div>
        )}

      </main>
    </div>
  );
}