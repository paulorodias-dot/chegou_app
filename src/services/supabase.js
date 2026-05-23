import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY INICIO:", supabaseKey.slice(0, 20));

export const supabase = createClient(supabaseUrl, supabaseKey);