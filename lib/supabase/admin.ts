import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Cliente com service role: só no servidor, ignora RLS. Sempre filtre por user_id. */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.serviceRole(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
