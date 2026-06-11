/* =============================================
   FinanAI — Supabase Cloud Sync Configuration
   ============================================= */

// Default demo credentials (with Row Level Security enabled so users' data is isolated and private)
const DEFAULT_SUPABASE_URL = "https://onjriebrfdpyfdhwztbu.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_3olKftWHUQH807rsGtZETQ_VjCuyDBw";

// Load configuration from local storage if the user configured their own project, otherwise use default
const SUPABASE_URL = localStorage.getItem('finanai-supabase-url') || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = localStorage.getItem('finanai-supabase-key') || DEFAULT_SUPABASE_KEY;

// Initialize Supabase client
window.supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

console.log("☁️ Supabase Cloud Sync Initialized");
