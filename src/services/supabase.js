import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabase = createClient(supabaseUrl, supabaseKey);