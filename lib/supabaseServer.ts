import { createClient } from '@supabase/supabase-js';

// This client uses the SECRET Service Role Key.
// It should ONLY be used in API routes or Server Actions.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // The Master Key
);