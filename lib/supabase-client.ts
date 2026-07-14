import { createClient } from '@supabase/supabase-js'

export const partnersSupabase = createClient(
  process.env.HT_PARTNERS_SUPABASE_URL!,
  process.env.HT_PARTNERS_SERVICE_ROLE_KEY!
)
