// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// This check prevents a crash if build workers hit this file without env vars
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. This is expected during some build phases.")
}

export const supabase = createClient(supabaseUrl, supabaseKey)