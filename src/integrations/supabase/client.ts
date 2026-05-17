// This file is managed by Dyad but can use environment variables
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pelqxsweoarqlwjsanlc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbHF4c3dlb2FycWx3anNhbmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTM2MDUsImV4cCI6MjA5Mzg2OTYwNX0.Rh8VxY55jfpROCovIDRW3eM4x_QZW3JVIICrEVaea4Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);