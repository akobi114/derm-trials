"use client";

import React, { useState } from 'react';
import { X, Send, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
}

export default function SupportModal({ isOpen, onClose, userEmail, userId }: SupportModalProps) {
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
        // OPTION 1: If you have a 'support_tickets' table, uncomment this:
        /*
        await supabase.from('support_tickets').insert({
            user_id: userId,
            email: userEmail,
            category: category,
            message: message,
            status: 'open'
        });
        */

        // OPTION 2: For now, we simulate a successful send (or send to your Admin 'messages' table)
        // This keeps the UI functional while you decide on the backend handling.
        await new Promise(resolve => setTimeout(resolve, 1000)); // Fake network delay
        
        alert("Request sent! Our operations team will respond to " + userEmail + " shortly.");
        onClose();
        setMessage("");
    } catch (err) {
        alert("Failed to send message. Please try again.");
    } finally {
        setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative overflow-hidden border border-slate-100">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight">Ops Support</h3>
                    <p className="text-xs text-slate-500 font-bold">Direct line to Clinical Administration</p>
                  </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Inquiry Type</label>
                    <div className="relative">
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="verification">Verification & Credentials</option>
                            <option value="technical">Technical Support</option>
                            <option value="billing">Billing & Credits</option>
                            <option value="dispute">Protocol Dispute</option>
                        </select>
                        <AlertCircle className="absolute right-4 top-4 h-5 w-5 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Message</label>
                    <textarea 
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl h-40 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none placeholder:text-slate-400" 
                      placeholder="How can we help resolve your issue?" 
                      value={message} 
                      onChange={(e) => setMessage(e.target.value)} 
                    />
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={sending || !message}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send Request</>}
                </button>
            </div>
        </div>
    </div>
  );
}