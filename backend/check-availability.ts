// check-availability.FIXED4 (2026-11-08) = FIXED3 + ROLLING LINKS. A link marked rolling (made with
// "Copy my calendar link") is topped up on every visit to the next 14 days of the host's working
// hours, at the link's slot length, so a link in a signature or old email never runs out of times.
// Painted links are untouched. The response gains "added": how many new times were stored, so the
// booking page knows to reload them. Requires rolling-links.sql.
//
// check-availability.FIXED3 = FIXED2 + a co-host's ("Meet With") busy time now hides the slot too.
// Teammates on a link were never checked, so the booking page happily offered times they were
// already booked for. Paste over the existing "check-availability" Edge Function body.
//
// check-availability.FIXED2 = FIXED + the host's own FOCUS TIME no longer hides a slot.
// Focus blocks the host chose to offer must stay clickable on the booking page.
// Paste over the existing "check-availability" Edge Function body.
// check-availability.FIXED — one change vs the deployed version: a teammate's OOO invite sitting
// on the host's calendar (showAs "oof", organized by someone else) no longer hides the host's
// open slots. Only the host's OWN OOO/busy events block. Paste over the existing
// "check-availability" Edge Function body.
//
// check-availability — NEW function. Given a booking link's slug, returns which of its OPEN slots
// are still genuinely free on the host's real Microsoft calendar. The public booking page (b.html)
// calls this so a time that got taken on another link (or by any meeting) disappears here too.
// It only returns slot IDs (no event details). Create as a NEW Edge Function named exactly
// "check-availability", and set "Verify JWT" = OFF (it's called with the anon key).
import { createClient } from "npm:@supabase/supabase-js@2";

// ---- co-host ("Meet With") free/busy ------------------------------------------------------
// Teammates attached to a link get invited to whatever the client books, so their busy time has
// to count here too — until now only the HOST's calendar was ever re-checked, which is how a
// teammate ended up invited to a time they were already booked for.
// POSITIVE DETECTION ONLY: if Graph cannot tell us about someone, we leave the slot alone rather
// than emptying the booking page (or rejecting a booking) over a transient error. The real guard
// is client-side — index.html / outlook-app.js refuse to OFFER unchecked time in the first place.
function gInstant(x) {
  const s = String((x && x.dateTime) || "");
  if (!s) return NaN;
  if (/(Z|[+-]\d\d:?\d\d)$/.test(s)) return +new Date(s);
  const tz = String((x && x.timeZone) || "UTC");
  const t = Date.parse(s + "Z");
  if (!isFinite(t)) return NaN;
  if (/^(utc|gmt|coordinated universal time)$/i.test(tz)) return t;
  try {
    const off = (ms) => {
      const p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(ms)).forEach((q) => { p[q.type] = q.value; });
      return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms) / 60000;
    };
    return t - off(t - off(t) * 60000) * 60000;
  } catch (_e) { return NaN; }
}
async function coHostBusy(accessToken, emails, fromIso, toIso) {
  const seen = {};
  const want = (emails ?? []).map((e) => String(e ?? "").toLowerCase()).filter((e) => e && !seen[e] && (seen[e] = 1)).slice(0, 20);
  if (!want.length) return [];
  const out = [];
  try {
    const r = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: 'outlook.timezone="UTC"' },
      body: JSON.stringify({
        schedules: want,
        startTime: { dateTime: new Date(fromIso).toISOString().slice(0, 19), timeZone: "UTC" },
        endTime: { dateTime: new Date(toIso).toISOString().slice(0, 19), timeZone: "UTC" },
        availabilityViewInterval: 15,
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    for (const s of (j.value ?? [])) {
      if (s.error) continue;                  // unreadable mailbox — never invent busy time
      for (const it of (s.scheduleItems ?? [])) {
        if (it.status === "free") continue;   // busy / tentative / oof / unknown all count
        const a = gInstant(it.start), b = gInstant(it.end);
        if (isFinite(a) && isFinite(b) && b > a) out.push([a, b]);
      }
    }
  } catch (_e) { return []; }
  return out;
}


// A focus block the host deliberately offered is NOT a booking conflict. The host only ever
// publishes a focus slot on purpose (they had to tick/paint it), so honour that intent here —
// otherwise the client clicks the slot and gets "no longer available".
// Meetings with other attendees are never treated as focus time.
function isFocusEvent(ev) {
  if (ev.isAllDay || ev.showAs === "oof") return false;
  if ((ev.attendees ?? []).length > 1) return false;
  const cats = (ev.categories ?? []).join(" ").toLowerCase();
  if (cats.includes("focus")) return true;
  const s = (ev.subject ?? "").trim().toLowerCase();
  return /^focus$|^(focus\s*(time|block|session)|deep\s*work|heads?[\s-]?down|no\s*meetings?)\b/.test(s)
    || /\bfocus time\b|\bdeep work\b/.test(s);
}


// ---- rolling links -----------------------------------------------------------------------------
const DAY = 86400000;
function localParts(ms, tz) {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
    .formatToParts(new Date(ms)).forEach((q) => { p[q.type] = q.value; });
  return { ymd: `${p.year}-${p.month}-${p.day}`, wd: p.weekday };
}
// Candidate start times (UTC ms) for the next `days` days of working hours in the link's time zone.
function rollingTimes(nowMs, tz, workStart, workEnd, lenMin, noticeH, days = 14) {
  const out = [], seen = new Set();
  const earliest = nowMs + Math.max(0, noticeH || 0) * 3600000;
  const ws = Math.round((workStart ?? 9) * 60), we = Math.round((workEnd ?? 18) * 60);
  for (let i = 0; i <= days; i++) {
    const { ymd, wd } = localParts(nowMs + i * DAY, tz);
    if (seen.has(ymd) || wd === "Sat" || wd === "Sun") continue;
    seen.add(ymd);
    for (let m = ws; m + lenMin <= we; m += lenMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0"), mm = String(m % 60).padStart(2, "0");
      const t = gInstant({ dateTime: `${ymd}T${hh}:${mm}:00`, timeZone: tz });
      if (isFinite(t) && t >= earliest && t < nowMs + days * DAY) out.push(t);
    }
  }
  return out;
}
async function topUpRolling(link, host) {
  const { data: all } = await sb.from("slots").select("start_utc,end_utc").eq("link_id", link.id);
  const rows = all ?? [];
  let len = rows.length ? Math.round((+new Date(rows[0].end_utc) - +new Date(rows[0].start_utc)) / 60000) : 30;
  if (!(len >= 15 && len <= 240)) len = 30;
  const have = new Set(rows.map((r) => +new Date(r.start_utc)));
  const fresh = rollingTimes(Date.now(), link.tz || "UTC", host?.work_start, host?.work_end, len, host?.min_notice_h)
    .filter((t) => !have.has(t)).slice(0, 400)
    .map((t) => ({ link_id: link.id, start_utc: new Date(t).toISOString(), end_utc: new Date(t + len * 60000).toISOString(), status: "open" }));
  if (!fresh.length) return 0;
  const { error } = await sb.from("slots").upsert(fresh, { onConflict: "link_id,start_utc", ignoreDuplicates: true });
  if (error) { console.error("rolling top-up failed:", error.message); return 0; }
  return fresh.length;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

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
  if (!r.ok) throw new Error("MS token refresh failed");
  return (await r.json()).access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let slug;
  try { ({ slug } = await req.json()); } catch (_e) { /* ignore */ }
  if (!slug) return json({ error: "missing slug" }, 400);

  const { data: link } = await sb.from("links").select("id,host_id,status,attendees,tz,rolling").eq("slug", slug).maybeSingle();
  if (!link || link.status !== "active") return json({ freeIds: [] });
  const { data: host } = link.rolling
    ? await sb.from("hosts").select("work_start,work_end,buffer_min,min_notice_h,day_cap").eq("id", link.host_id).maybeSingle()
    : { data: null };
  let added = 0;
  if (link.rolling) { try { added = await topUpRolling(link, host); } catch (e) { console.error("rolling:", String(e)); } }

  const { data: slots } = await sb.from("slots").select("id,start_utc,end_utc").eq("link_id", link.id).eq("status", "open");
  const open = (slots ?? []).filter((s) => new Date(s.end_utc) > new Date());
  if (!open.length) return json({ freeIds: [], added });

  // Need the host's Microsoft token to read their real calendar. If unavailable, treat all open
  // slots as free (never over-hide — booking still works, just without the cross-check).
  const { data: refresh } = await sb.rpc("get_host_token", { p_host: link.host_id, p_provider: "microsoft" });
  if (!refresh) return json({ freeIds: open.map((s) => s.id), added });

  const busy = [];
  try {
    const tk = await msAccessToken(refresh);
    const min = new Date(Math.min(...open.map((s) => +new Date(s.start_utc)))).toISOString();
    const max = new Date(Math.max(...open.map((s) => +new Date(s.end_utc)))).toISOString();
    let next = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({
      startDateTime: min, endDateTime: max, "$select": "start,end,showAs,responseStatus,isOrganizer,subject,categories,attendees,isAllDay", "$top": "200",
    });
    let guard = 0;
    while (next && guard++ < 10) {
      const r = await fetch(next, { headers: { Authorization: `Bearer ${tk}`, Prefer: 'outlook.timezone="UTC"' } });
      if (!r.ok) break;
      const j = await r.json();
      for (const ev of (j.value ?? [])) {
        if (!ev.start?.dateTime || !ev.end?.dateTime) continue;
        if (ev.showAs === "free" || ev.showAs === "workingElsewhere") continue;
        if (ev.responseStatus?.response === "declined") continue;
        if (ev.showAs === "oof" && ev.isOrganizer === false) continue; // someone else's OOO invite — informational, not a block
        if (isFocusEvent(ev)) continue;                    // host's own focus time — offered on purpose, keep the slot bookable
        busy.push([+new Date(ev.start.dateTime + "Z"), +new Date(ev.end.dateTime + "Z")]);
      }
      next = j["@odata.nextLink"] ?? null;
    }
    // ...and the co-hosts who get invited alongside the host
    const coHosts = Array.isArray(link.attendees) ? link.attendees : [];
    for (const seg of await coHostBusy(tk, coHosts, min, max)) busy.push(seg);
  } catch (_e) {
    return json({ freeIds: open.map((s) => s.id), added });
  }

  // Rolling links were generated without looking at meetings, so the host's buffer applies here.
  const buf = link.rolling ? Math.max(0, host?.buffer_min ?? 0) * 60000 : 0;
  const overlaps = (s) => {
    const a = +new Date(s.start_utc), b = +new Date(s.end_utc);
    return busy.some(([x, y]) => x - buf < b && y + buf > a);
  };
  let free = open.filter((s) => !overlaps(s)).sort((p, q) => +new Date(p.start_utc) - +new Date(q.start_utc));
  const cap = link.rolling ? (host?.day_cap ?? 0) : 0;   // "max meetings a day" for rolling links
  if (cap > 0) {
    const perDay = {};
    free = free.filter((s) => { const k = localParts(+new Date(s.start_utc), link.tz || "UTC").ymd; perDay[k] = (perDay[k] ?? 0) + 1; return perDay[k] <= cap; });
  }
  return json({ freeIds: free.map((s) => s.id), added });
});