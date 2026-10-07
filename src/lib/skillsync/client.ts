import { createClient } from "@supabase/supabase-js";

// Publishable key — safe for browser use. All reads go through the existing `skillsync` schema.
const SUPABASE_URL = "https://vpbdrmyuglmquaohizdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_19cnZoT2TJQppxs50TgtbQ_h9sMvFTt";

export const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: "skillsync" },
  auth: { persistSession: false, autoRefreshToken: false },
}).schema("skillsync");
