// Browser-safe configuration. Never put a secret/service_role key in this file.
// Access must be protected by Supabase Row Level Security.
window.NOVA_SUPABASE = Object.freeze({
  url: 'https://vldalhggkkfoziaxloea.supabase.co',
  publishableKey: 'sb_publishable_VZnpPhpWqxtE2rxQSxxgyg_ytIErw5S'
});

window.getNovaSupabase = function () {
  if (!window.supabase || !window.NOVA_SUPABASE) return null;
  if (!window.__novaSupabaseClient) {
    window.__novaSupabaseClient = window.supabase.createClient(
      window.NOVA_SUPABASE.url,
      window.NOVA_SUPABASE.publishableKey
    );
  }
  return window.__novaSupabaseClient;
};
