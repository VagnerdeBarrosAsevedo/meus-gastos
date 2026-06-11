/* =============================================
   FinanAI — Supabase Cloud Sync Configuration
   ============================================= */

// Default demo credentials (with Row Level Security enabled so users' data is isolated and private)
const DEFAULT_SUPABASE_URL = "https://vjylwzvfeymryjuhykwm.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeWx3enZmZXltcnlqdWh5a3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjgyOTcsImV4cCI6MjA2NTI0NDI5N30.84Nsk2l1Yw9N21Fw50mX_y59j7iW3y0dM983x14P2kU";

// Load configuration from local storage if the user configured their own project, otherwise use default
const SUPABASE_URL = localStorage.getItem('finanai-supabase-url') || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = localStorage.getItem('finanai-supabase-key') || DEFAULT_SUPABASE_KEY;

// Initialize Supabase client
window.supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

console.log("☁️ Supabase Cloud Sync Initialized");
