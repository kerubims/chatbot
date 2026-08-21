import { createClient } from "@supabase/supabase-js";

// Make sure to set these in your .env or .env.local file.
// For this session, we'll hardcode them if they don't exist to avoid setup friction.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xtsztguaqlqaufkfsxwh.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_9frMo7QnEc1wl6_xm_kvIg_qF8xRFAc";

export const supabase = createClient(supabaseUrl, supabaseKey);
