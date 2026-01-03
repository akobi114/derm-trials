"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, MessageSquare } from 'lucide-react';

// Import the shared modal (adjusting path to reach into researcher folder)
import SupportModal from './researcher/components/SupportModal';

export default function DashboardRedirect() {
  const router = useRouter();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) { 
        console.warn("🔍 [Router] No active session. Redirecting to login.");
        router.replace('/login'); 
        return; 
      }

      console.log("🔍 [Router] Processing identity for UID:", user.id);

      // --- 1. PRIORITY 0: THE METADATA BADGE CHECK ---
      const badgeRole = user.app_metadata?.role;
      if (badgeRole === 'super_admin') {
        router.replace('/admin');
        return;
      }

      // --- 2. FALLBACK CHECK: WEBSITE ADMIN TABLE ---
      const { data: adminRecord } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminRecord) {
        router.replace('/admin'); 
        return;
      }

      // --- 3. CHECK: CLINICAL STAFF (With Retry Logic) ---
      let [researcherRes, teamRes] = await Promise.all([
        supabase.from('researcher_profiles').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('team_members').select('id').eq('user_id', user.id).maybeSingle()
      ]);

      // If not found immediately, wait 1.5s for DB Sync (Race Condition Fix)
      if (!researcherRes.data && !teamRes.data) {
        console.warn("🔍 [Router] Profile not found yet. Retrying in 1.5s...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const [retryRes, retryTeam] = await Promise.all([
          supabase.from('researcher_profiles').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('team_members').select('id').eq('user_id', user.id).maybeSingle()
        ]);
        
        researcherRes = retryRes;
        teamRes = retryTeam;
      }

      if (researcherRes.data || teamRes.data) {
        console.log("✅ Identity: Clinical Staff detected. Routing to Researcher Portal.");
        router.replace('/dashboard/researcher');
        return;
      }

      // --- 4. CHECK: CANDIDATE ---
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidate) {
        router.replace('/dashboard/candidate');
        return;
      }

      // --- 5. ULTIMATE FALLBACK ---
      console.error("❌ [Router Error] Authenticated user has no profile record after retry. UID:", user.id);
      router.replace('/'); 
    }
    
    checkRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
        </div>
        <div className="text-center">
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Secure Access</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Verifying clinic credentials...</p>
        </div>

        {/* SUPPORT TRIGGER (Added for Stuck Users) */}
        <button 
            onClick={() => setIsSupportOpen(true)}
            className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
        >
            <MessageSquare className="h-4 w-4" /> Help / Support
        </button>
      </div>

      {/* SUPPORT MODAL */}
      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        // Note: We don't pass email/ID here because the user object might not be fully loaded 
        // in this specific scope, but the modal handles empty props gracefully.
      />
    </div>
  );
}