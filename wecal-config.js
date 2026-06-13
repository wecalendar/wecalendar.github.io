// ── WeCalendar backend config ───────────────────────────────────────
// Fill these in after you create your Supabase project + OAuth clients.
// Safe to commit to a public repo: the anon key and client IDs are PUBLIC
// values. Row Level Security (see schema.sql) protects your data; the
// client SECRETS live only in Supabase Edge Function env vars.
//
// Leave SUPABASE_URL empty to keep WeCalendar in its current
// email-deeplink mode (the booking backend stays dorment, app still works).
// ────────────────────────────────────────────────────────────────────
window.WECAL = {
  SUPABASE_URL:      "https://ihgtypkjugjsqygqynkl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_wUcngM9Ehh9odgkUYzDBgg_kmOMR4oW",
  FN_BASE:           "",   // optional; defaults to SUPABASE_URL + "/functions/v1"

  MS_CLIENT_ID:      "d64e24c4-3c00-4b04-9ab0-e337d5fcc34b", // same Entra app
  MS_TENANT:         "wetransact.io",
  GOOGLE_CLIENT_ID:  "",   // from Google Cloud Console (optional, for Google hosts)
};
window.WECAL.FN_BASE = window.WECAL.FN_BASE ||
  (window.WECAL.SUPABASE_URL ? window.WECAL.SUPABASE_URL + "/functions/v1" : "");
