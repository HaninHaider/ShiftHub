
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Keep one Supabase connection for the pages that need it.
const supabaseUrl = "https://kbjnuduezrrmxzcpqjqj.supabase.co";
const supabaseKey = "sb_publishable_7DrRq7wX5rocrFuqUQ2FUw_atmZQ_yy";

export const supabase = createClient(supabaseUrl, supabaseKey);
