"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, FlaskConical, X, Loader2, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Footer() {
  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general_inquiry',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        researcher_name: formData.name,
        researcher_email: formData.email,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        status: 'open'
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
        setFormData({ name: '', email: '', category: 'general_inquiry', subject: '', message: '' });
      }, 2000);

    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <footer className="bg-slate-950 text-slate-400 py-10 font-sans mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-slate-900 pb-8 mb-8">
            
            {/* BRAND COLUMN */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-2 text-white opacity-90">
                <div className="bg-slate-800 p-1.5 rounded-lg">
                  <FlaskConical className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="font-bold text-base tracking-tight">DermTrials</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
                Connecting eligible patients with breakthrough dermatology clinical trials.
              </p>
            </div>

            {/* NAVIGATION LINKS */}
            <div className="md:col-span-4 flex flex-wrap justify-center gap-6 text-xs font-medium">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/conditions" className="hover:text-white transition-colors">Browse Conditions</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms & Data</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>

            {/* COMPACT CONTACT BUTTON */}
            <div className="md:col-span-4 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group flex items-center gap-2 bg-slate-900 border border-slate-800 text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-indigo-600 hover:border-indigo-500 transition-all active:scale-[0.98]"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-colors" />
                Contact Support
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-600">
             © {new Date().getFullYear()} DermTrials Research. All rights reserved.
          </div>

        </div>
      </footer>

      {/* --- CONTACT SUPPORT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" /> Contact Support
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h4>
                  <p className="text-sm text-slate-500">Our team will review your ticket shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                      <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" placeholder="John Smith" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                      <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" placeholder="name@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topic</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="general_inquiry">General Inquiry</option>
                      <option value="technical_issue">Technical Issue</option>
                      <option value="missing_trial">Missing / Incorrect Trial Data</option>
                      <option value="claim_dispute">Claim Dispute</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                    <textarea required rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-none" placeholder="How can we help you?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                    {loading ? "Sending..." : "Submit Ticket"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}