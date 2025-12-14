"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push('/login'); 
        return; 
      }

      // 1. Check if Researcher
      const { data: researcher } = await supabase
        .from('researcher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (researcher) {
        router.push('/dashboard/researcher');
        return;
      }

      // 2. Check if Candidate
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (candidate) {
        router.push('/dashboard/candidate');
        return;
      }

      // 3. Fallback (If Admin or Unknown)
      router.push('/dashboard/admin'); // Or create a generic 'onboarding' page
    }
    
    checkRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-400">Directing to your portal...</p>
      </div>
    </div>
  );
}