// publish-link — FIXED5 (2026-11-08): body.check → is MY booking connection working? body.checkAll →
// (owner only) test every host's connection. Both record host_tokens.check_ok / checked_at.
// Requires connection-check.sql.
// publish-link — FIXED4 (2026-11-08): cap raised 200 → 400 (15-min calendar links were refused), and
// body.rolling marks "my calendar link" links as rolling.
// publish-link — FIXED3 = faster. Verifies the host once with Graph (minimal payload), then does
// host-upsert + token-check + link-insert + slots-insert in a SINGLE database call (the publish_link
// RPC) instead of four sequential round-trips. Same request/response shape as before.
// Deploy AFTER running publish-link-rpc.sql. Supabase → Edge Functions → publish-link → paste all → Deploy.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      };

      const json = (b, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

        const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

        const APP_URL = Deno.env.get("APP_URL") ?? "https://wecalendar.github.io/";

        const ALLOWED_DOMAINS = ["wetransact.io", "awssome.io"];
const OWNERS = ["ruby.sran@wetransact.io"];   // may run the all-hosts connection sweep

// Same refresh as check-availability / book-slot. Throws when Microsoft refuses the stored token.
async function msAccessToken(refreshToken) {
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
    throw new Error("refresh_failed:" + code);
  }
  return (await r.json()).access_token;
}
// Is this host's stored Microsoft calendar connection usable right now? Records the result.
async function checkHost(hostId) {
  const { data: refresh } = await sb.rpc("get_host_token", { p_host: hostId, p_provider: "microsoft" });
  if (!refresh) return { connected: false, reason: "not_connected" };
  let ok = true, reason = "";
  try { await msAccessToken(refresh); } catch (e) { ok = false; reason = String(e.message || e).replace(/^refresh_failed:?/, "") || "expired"; }
  await sb.from("host_tokens").update({ check_ok: ok, checked_at: new Date().toISOString() }).eq("host_id", hostId).eq("provider", "microsoft");
  return ok ? { connected: true } : { connected: false, reason: "expired", code: reason };
}

        Deno.serve(async (req) => {
          if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
            if (req.method !== "POST") return json({ error: "POST only" }, 405);

              const msToken = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
                if (!msToken) return json({ error: "missing token" }, 401);

                  // Verify identity with Microsoft (kept for security) — ask for only the 3 fields we need.
                    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName", {
                        headers: { Authorization: `Bearer ${msToken}` },
                          });
                            if (!meRes.ok) return json({ error: "could not verify host" }, 401);

                              const me = await meRes.json();
                                const email = (me.mail ?? me.userPrincipalName ?? "").toLowerCase();
                                  if (!email) return json({ error: "could not verify host" }, 401);
                                    if (!ALLOWED_DOMAINS.some((d) => email.endsWith("@" + d))) return json({ error: "not allowed" }, 403);

                                      const body = await req.json();

  if (body.check === true) {
    const { data: host } = await sb.from("hosts").select("id").ilike("email", email).maybeSingle();
    if (!host) return json({ connected: false, reason: "not_connected" });
    return json(await checkHost(host.id));
  }
  if (body.checkAll === true) {
    if (!OWNERS.includes(email)) return json({ error: "not allowed" }, 403);
    const { data: rows } = await sb.from("host_tokens").select("host_id").eq("provider", "microsoft");
    const { data: hosts } = await sb.from("hosts").select("id,email,display_name");
    const byId = Object.fromEntries((hosts ?? []).map((h) => [h.id, h]));
    const out = [];
    for (const r of rows ?? []) {
      const res = await checkHost(r.host_id);
      const h = byId[r.host_id] ?? {};
      out.push({ email: h.email ?? "", name: h.display_name ?? "", ...res });
    }
    const connectedIds = new Set((rows ?? []).map((r) => r.host_id));
    for (const h of hosts ?? []) if (!connectedIds.has(h.id)) out.push({ email: h.email, name: h.display_name ?? "", connected: false, reason: "not_connected" });
    return json({ hosts: out });
  }
                                        const s = body.settings ?? {};
                                          const incoming = Array.isArray(body.slots) ? body.slots : [];
                                            if (incoming.length > 400) return json({ error: "too many slots", detail: "too many times on one link (max 400)" }, 400);

                                              const { data, error } = await sb.rpc("publish_link", {
                                                  p_email: email,
                                                      p_name: me.displayName ?? email,
                                                          p_title: body.title ?? "Meeting",
                                                              p_tz: body.tz ?? "UTC",
                                                                  p_attendees: body.attendees ?? [],
                                                                      p_video: body.videoLink ?? "",
                                                                          p_work_start: s.workStart ?? 9,
                                                                              p_work_end: s.workEnd ?? 18,
                                                                                  p_buffer: s.buffer ?? 0,
                                                                                      p_min_notice: s.minNotice ?? 0,
                                                                                          p_day_cap: s.dayCap ?? 0,
                                                                                              p_slots: incoming,
                                                                                                });

                                                                                                  if (error) return json({ error: "could not create link", detail: error.message }, 500);

                                                                                                    const r = data || {};
                                                                                                      if (r.ok === false && r.error === "not_connected") {
                                                                                                          return json({ error: "not_connected", message: "Connect your calendar for booking first." }, 412);
                                                                                                            }
                                                                                                              if (!r.slug) return json({ error: "could not create link", detail: JSON.stringify(r) }, 500);

                                                                                                                // "Copy my calendar link" links roll: check-availability keeps them topped up to the next 14 days.
  if (body.rolling === true) await sb.from("links").update({ rolling: true }).eq("slug", r.slug);
  return json({ slug: r.slug, url: `${APP_URL}b.html?l=${r.slug}`, count: r.count ?? 0 });
                                                                                                                });