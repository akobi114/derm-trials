"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Home, MessageSquare, Send, CheckCircle2, Compass 
} from 'lucide-react';

export default function NotFound() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  // Store debug info here
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // 1. Capture Technical Context
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : "Unknown";
    const referrer = typeof document !== 'undefined' ? document.referrer : "Direct/Unknown";
    
    // 2. Retrieve History from Session Storage (created by NavigationTracker)
    let history = [];
    try {
        history = JSON.parse(window.sessionStorage.getItem("dermtrials_nav_history") || "[]");
    } catch (e) { console.error("Could not read nav history", e); }

    setDebugInfo({
        currentPath,
        referrer,
        history
    });

    // 3. Check User
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const contactEmail = user?.email || email;
    const contactName = user ? "Registered User" : "Visitor";

    // Format the history so it looks nice in the Admin Panel
    const historyString = debugInfo.history && debugInfo.history.length > 0 
        ? debugInfo.history.join('  ➡️  ') 
        : "No history available";

    // This is the formatted message that will appear in your Admin Inbox
    const fullMessage = `
USER REPORT:
${message}

--- TECHNICAL CONTEXT ---
Target Path: ${debugInfo.currentPath}
Previous Page: ${debugInfo.referrer}

SESSION HISTORY:
${historyString}
    `.trim();

    const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id || null,
        researcher_email: contactEmail,
        researcher_name: contactName,
        category: '404_error',
        subject: `404 Error at: ${debugInfo.currentPath}`,
        message: fullMessage, // Saving the full detailed message
        path_name: debugInfo.currentPath
    });

    if (error) {
        alert("Something went wrong sending the report. Please try again.");
    } else {
        setIsSent(true);
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* LEFT: Friendly Message */}
        <div className="p-8 flex flex-col justify-center bg-indigo-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                    <Compass className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold mb-4">Off the map.</h1>
                <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                    We can't seem to find the page you're looking for. It might have moved, or the link might be broken.
                </p>
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors w-fit"
                >
                    <Home className="h-4 w-4" /> Return Home
                </Link>
            </div>
        </div>

        {/* RIGHT: Support Form */}
        <div className="p-8 flex flex-col justify-center">
            {isSent ? (
                <div className="text-center py-10 animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Thanks for letting us know!</h3>
                    <p className="text-slate-500 text-sm">We've alerted the admin team. We'll look into this broken link immediately.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-amber-500" /> Help us fix it?
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Let us know what you were trying to do right before you got here. We automatically captured the error details to help us fix it faster.
                        </p>
                    </div>

                    {!user && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Email (Optional)</label>
                            <input 
                                type="email" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">What happened?</label>
                        <textarea 
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-32 resize-none"
                            placeholder="e.g. I clicked on the 'Edit Study' button and..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSending || !message}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                        {isSending ? "Sending..." : "Send Report"} <Send className="h-4 w-4" />
                    </button>
                </form>
            )}
        </div>

      </div>
    </div>
  );
}