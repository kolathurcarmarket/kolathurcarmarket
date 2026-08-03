/**
 * Initializes a single shared Supabase client instance.
 * Requires the supabase-js CDN script to be loaded before this file.
 */
(function () {
  if (!window.supabase) {
    console.error("Supabase JS library not loaded. Check your <script> tags.");
    return;
  }
  window.db = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
})();
