// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * RESTORES THE SIDEBAR: This constant MUST be named 'supabase'.
 * PREVENTS BUILD CRASH: If keys are missing (during Vercel build), 
 * it uses a dummy URL instead of crashing.
 */
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : createClient('https://dummy.supabase.co', 'dummy-key');

/**
 * BACKUP FUNCTION: Used for safe runtime checks if needed.
 */
export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};