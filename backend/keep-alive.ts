// keep-alive (2026-11-08) — weekly. Uses every host's stored Microsoft calendar connection once, so none
// sits unused for Microsoft's 90-day limit (AADSTS700082). Saves the fresh refresh token Microsoft returns,
// records host_tokens.check_ok / checked_at, and emails the owner a short list of anyone whose connection
// is broken (only when there is someone on it). Nothing is read from or written to anyone's calendar.
//
// Called by pg_cron job "wecal-keepalive" with the same x-cron-key header as cron-reminders.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

async function refresh(hostId, refreshToken) {
  const tenant = Deno.env.get("MS_TENANT") ?? "common";
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("MS_CLIENT_ID"),
      client_secret: Deno.env.get("MS_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "openid profile email offline_access Calendars.ReadWrite.Shared",
    }),
  });
  if (!r.ok) {
    let code = "";
    try { const j = await r.json(); code = String(j.error_codes?.[0] ?? j.error ?? ""); } catch (_e) { /* ignore */ }
    return { ok: false, code };
  }
  const j = await r.json();
  if (j.refresh_token && j.refresh_token !== refreshToken) {
    await sb.rpc("store_host_token", { p_host: hostId, p_provider: "microsoft", p_token: j.refresh_token, p_scope: j.scope ?? null });
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  const key = Deno.env.get("CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);

  const { data: rows } = await sb.from("host_tokens").select("host_id").eq("provider", "microsoft");
  const { data: hosts } = await sb.from("hosts").select("id,email,display_name");
  const byId = Object.fromEntries((hosts ?? []).map((h) => [h.id, h]));

  let ok = 0;
  const broken = [];
  for (const r of rows ?? []) {
    let res = { ok: false, code: "no_token" };
    try {
      const { data: rt } = await sb.rpc("get_host_token", { p_host: r.host_id, p_provider: "microsoft" });
      if (rt) res = await refresh(r.host_id, rt);
    } catch (e) { res = { ok: false, code: String(e).slice(0, 60) }; }
    await sb.from("host_tokens").update({ check_ok: res.ok, checked_at: new Date().toISOString() })
      .eq("host_id", r.host_id).eq("provider", "microsoft");
    if (res.ok) ok++;
    else { const h = byId[r.host_id] ?? {}; broken.push(`${h.display_name || h.email || r.host_id} (${h.email ?? ""})`); }
  }

  // Weekly summary to the owner, only when someone needs to reconnect. Reuses send-feedback's email path.
  let emailed = false;
  if (broken.length) {
    const msg = `WeCalendar weekly connection check: ${ok} working, ${broken.length} need to reconnect.\n\n` +
      broken.map((b) => "• " + b).join("\n") +
      `\n\nThey see a "Reconnect your calendar" alert in WeCalendar. Until they reconnect, clients can't book their links.`;
    try {
      const anon = Deno.env.get("SUPABASE_ANON_KEY");
      const r = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon, Authorization: "Bearer " + anon },
        body: JSON.stringify({ message: msg, name: "WeCalendar keep-alive", email: "" }),
      });
      emailed = r.ok;
    } catch (_e) { /* the run itself still succeeded */ }
  }
  return json({ checked: (rows ?? []).length, ok, broken: broken.length, emailed });
});
