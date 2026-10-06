import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabase!) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }