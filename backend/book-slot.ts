// book-slot.FIXED (2026-11-08): keeps the rotated Microsoft refresh token, so connections stop expiring.
// book-slot — FIXED10 = FIXED9 + the final availability check now covers the link's CO-HOSTS
// ("Meet With" teammates), not just the host. A slot a teammate is busy for is refused with
// the same no_longer_available response as a host clash. Supersedes FIXED9.
// book-slot — FIXED9 = FIXED8 + the host's own FOCUS TIME is no longer a booking conflict.
// If the host published a slot that sits on their focus block, they meant to offer it
// (urgent client cases), so the booking must go through. Supersedes FIXED8.
// book-slot — FIXED8 = FIXED7 + msHasConflict no longer treats a teammate's OOO invite on the
// host's calendar (showAs "oof", organized by someone else) as a booking conflict. Supersedes FIXED7.
// book-slot — FIXED7 = FIXED6 + the booked meeting's title gets the client's company appended,
// derived from the booker's email domain: "<invite title> | <Company>" (e.g. "WeTransact | Blueedge").
// Personal/free email domains (gmail, outlook, …) fall back to the booker's name. Supersedes FIXED6.
// (Do NOT deploy FIXED5 — that was the dropped hold feature.)
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const APP_URL = Deno.env.get("APP_URL") ?? "https://wecalendar.github.io/";

// Free / personal email providers — for these we use the person's name, not the domain.
const FREE_EMAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
  "yahoo.com", "yahoo.co.uk", "ymail.com", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "mail.com", "yandex.com",
  "zoho.com", "hey.com", "fastmail.com", "qq.com", "163.com", "126.com",
]);

// Turn a booker's email into a display "company": the domain's core label, prettified.
// blueedge.io -> "Blueedge"; acme-corp.com -> "Acme Corp"; foo.co.uk -> "Foo".
function companyFromEmail(email, fallbackName) {
  const domain = String(email || "").split("@")[1]?.toLowerCase().trim() || "";
  const name = String(fallbackName || "").trim();
  if (!domain || FREE_EMAIL.has(domain)) return name;
  const parts = domain.split(".");
  let core;
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 &&
      ["co", "com", "org", "net", "gov", "ac", "edu"].includes(parts[parts.length - 2])) {
    core = parts[parts.length - 3];               // foo.co.uk -> foo
  } else {
    core = parts[parts.length - 2] || parts[0];   // blueedge.io -> blueedge
  }
  if (!core) return name;
  const pretty = core.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return pretty || name;
}
function buildSubject(baseTitle, email, name) {
  const base = (baseTitle && String(baseTitle).trim()) || "Meeting";
  const company = companyFromEmail(email, name);
  return company ? base + " | " + company : base;
}

async function msAccessToken(refreshToken, hostId = null) {
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
  if (!r.ok) throw new Error("MS token refresh failed: " + (await r.text()));
  const j = await r.json();
  // Microsoft returns a fresh refresh token on every use. Keep it, or the stored one dies ~90 days
  // after the person connected however often it's used (AADSTS700082 — 26 of 36 hosts on 2026-11-08).
  if (hostId && j.refresh_token && j.refresh_token !== refreshToken) {
    try { await sb.rpc("store_host_token", { p_host: hostId, p_provider: "microsoft", p_token: j.refresh_token, p_scope: j.scope ?? null }); }
    catch (e) { console.error("store rotated token failed:", String(e)); }
  }
  return j.access_token;
}
async function googleAccessToken(refreshToken) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!r.ok) throw new Error("Google token refresh failed: " + (await r.text()));
  return (await r.json()).access_token;
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

async function msHasConflict(accessToken, startUtc, endUtc) {
  const url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({
    startDateTime: startUtc, endDateTime: endUtc, "$select": "start,end,showAs,responseStatus,isOrganizer,subject,categories,attendees,isAllDay", "$top": "50",
  });
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } });
  if (!r.ok) return false;
  const j = await r.json();
  const a = +new Date(startUtc), b = +new Date(endUtc);
  return (j.value ?? []).some((ev) =>
    ev.start?.dateTime && ev.end?.dateTime &&
    ev.showAs !== "free" && ev.showAs !== "workingElsewhere" &&
    ev.responseStatus?.response !== "declined" &&
    !(ev.showAs === "oof" && ev.isOrganizer === false) && // someone else's OOO invite — informational, not a conflict
    !isFocusEvent(ev) &&                                  // host's own focus time — offered on purpose, not a conflict
    (+new Date(ev.start.dateTime + "Z") < b) && (+new Date(ev.end.dateTime + "Z") > a));
}
async function createMicrosoftEvent(refreshToken, ev, accessToken) {
  const tk = accessToken ?? await msAccessToken(refreshToken);
  const attendees = [
    { emailAddress: { address: ev.guestEmail, name: ev.guestName }, type: "required" },
    ...(ev.coHosts ?? []).map((e) => ({ emailAddress: { address: e }, type: "required" })),
    ...(ev.guests ?? []).map((e) => ({ emailAddress: { address: e }, type: "required" })),
  ];
  const r = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: ev.title,
      start: { dateTime: ev.startUtc, timeZone: "UTC" },
      end: { dateTime: ev.endUtc, timeZone: "UTC" },
      attendees,
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      ...(ev.cancelUrl ? { body: { contentType: "HTML", content: `Booked via WeCalendar.<br><br>Need to cancel? <a href="${ev.cancelUrl}">Cancel this meeting</a> (frees the time and notifies everyone).` } } : {}),
      ...(ev.videoLink ? { location: { displayName: ev.videoLink } } : {}),
    }),
  });
  if (!r.ok) throw new Error("Graph create event failed: " + (await r.text()));
  const j = await r.json();
  return { eventId: j.id, joinUrl: j.onlineMeeting?.joinUrl ?? ev.videoLink ?? null };
}
async function createGoogleEvent(refreshToken, ev) {
  const tk = await googleAccessToken(refreshToken);
  const r = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: ev.title,
        start: { dateTime: ev.startUtc, timeZone: "UTC" },
        end: { dateTime: ev.endUtc, timeZone: "UTC" },
        ...(ev.cancelUrl ? { description: "Booked via WeCalendar. Need to cancel? " + ev.cancelUrl + " (frees the time and notifies everyone)." } : {}),
        attendees: [{ email: ev.guestEmail, displayName: ev.guestName }, ...(ev.coHosts ?? []).map((e) => ({ email: e })), ...(ev.guests ?? []).map((e) => ({ email: e }))],
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      }),
    },
  );
  if (!r.ok) throw new Error("Google create event failed: " + (await r.text()));
  const j = await r.json();
  return { eventId: j.id, joinUrl: j.hangoutLink ?? ev.videoLink ?? null };
}

const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const { data: allowed } = await sb.rpc("rate_check", { p_bucket: "book:" + ip, p_limit: 20, p_window_secs: 60 });
  if (allowed === false) return json({ ok: false, reason: "rate_limited" }, 429);

  const { slotId, name, email, guests } = await req.json();
  if (!slotId || !name || !email) return json({ error: "missing fields" }, 400);
  if (typeof email !== "string" || !/.+@.+\..+/.test(email) || String(name).length > 120) {
    return json({ error: "invalid name or email" }, 400);
  }
  const cleanGuests = Array.isArray(guests)
    ? [...new Set(guests.map((g) => String(g).trim().toLowerCase()).filter((g) => /.+@.+\..+/.test(g) && g !== String(email).toLowerCase()))].slice(0, 10)
    : [];

  const { data: claim, error: claimErr } = await sb.rpc("book_slot", { p_slot: slotId, p_name: name, p_email: email });
  if (claimErr) return json({ ok: false, reason: "taken" }, 409);
  const booking = Array.isArray(claim) ? claim[0] : claim;

  const rollback = async () => {
    await sb.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    await sb.from("slots").update({ status: "open", booking_id: null }).eq("id", slotId);
  };

  const { data: slot } = await sb.from("slots").select("start_utc,end_utc,link_id").eq("id", slotId).single();
  const { data: link } = await sb.from("links").select("title,host_id,attendees").eq("id", slot.link_id).single();
  const { data: host } = await sb.from("hosts").select("default_provider,video_link").eq("id", link.host_id).single();
  const { data: toks } = await sb.from("host_tokens").select("provider").eq("host_id", link.host_id);
  if (!toks || !toks.length) { await rollback(); return json({ ok: false, reason: "host_not_connected" }, 502); }

  const provider = host.default_provider ?? toks[0].provider;
  const chosenProvider = toks.some((t) => t.provider === provider) ? provider : toks[0].provider;

  const { data: refreshToken, error: tokErr } = await sb.rpc("get_host_token", { p_host: link.host_id, p_provider: chosenProvider });
  if (tokErr || !refreshToken) { console.error("get_host_token failed:", tokErr && tokErr.message); await rollback(); return json({ ok: false, reason: "host_not_connected" }, 502); }

  // Final availability check: make sure the host is still free at this exact time.
  let msToken = null;
  if (chosenProvider === "microsoft") {
    try {
      msToken = await msAccessToken(refreshToken, link.host_id);
      if (await msHasConflict(msToken, slot.start_utc, slot.end_utc)) {
        await rollback();
        return json({ ok: false, reason: "no_longer_available" }, 409);
      }
      // ...and that every co-host on the link is still free at this exact time
      const coHosts = Array.isArray(link.attendees) ? link.attendees : [];
      if (coHosts.length) {
        const sa = +new Date(slot.start_utc), sb2 = +new Date(slot.end_utc);
        const segs = await coHostBusy(msToken, coHosts, slot.start_utc, slot.end_utc);
        if (segs.some(([x, y]) => x < sb2 && y > sa)) {
          await rollback();
          return json({ ok: false, reason: "no_longer_available" }, 409);
        }
      }
    } catch (_e) { /* if the check fails, fall through and let the booking proceed */ }
  }

  let result;
  try {
    const ev = {
      title: buildSubject(link.title, email, name),   // "<invite title> | <Company or name>"
      startUtc: slot.start_utc, endUtc: slot.end_utc,
      guestName: name, guestEmail: email, coHosts: link.attendees ?? [], guests: cleanGuests,
      videoLink: host.video_link ?? undefined,
      cancelUrl: APP_URL + "b.html?cancel=" + booking.id,
    };
    result = chosenProvider === "google"
      ? await createGoogleEvent(refreshToken, ev)
      : await createMicrosoftEvent(refreshToken, ev, msToken);
  } catch (e) {
    console.error("book-slot calendar error:", String(e));
    await rollback();
    return json({ ok: false, reason: "calendar_error" }, 502);
  }

  await sb.from("bookings").update({ host_provider: chosenProvider, host_event_id: result.eventId, join_url: result.joinUrl }).eq("id", booking.id);
  await sb.from("analytics_events").insert({ link_id: slot.link_id, type: "book", meta: { slotId } });
  return json({ ok: true, joinUrl: result.joinUrl, bookingId: booking.id });
});