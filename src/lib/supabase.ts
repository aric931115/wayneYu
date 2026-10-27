
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const supabaseConfigurationMessage =
  "尚未設定 Supabase。請複製 .env.example 為 .env.local，填入 Supabase URL 與 publishable key 後重新啟動。";
