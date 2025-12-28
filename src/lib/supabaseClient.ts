import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});