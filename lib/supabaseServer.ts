// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Named Export: supabaseServer
 * Uses a dummy fallback during build to satisfy TypeScript and Next.js.
 */
export const supabaseServer = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : createClient('https://dummy.supabase.co', 'dummy-key');

/**
 * Function Export: getSupabaseServer
 * Used by /api/generate/route.ts.
 */
export const getSupabaseServer = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};