#!/usr/bin/env node
/*
 * Rebuilds docs-index.json for the WeCalendar "Insert docs links" picker.
 *
 * Source of truth = https://docs.wetransact.io/sitemap.xml (Archbee publishes
 * every article there). Category/section pages in the sitemap are filtered out —
 * the picker lists articles only (see CATEGORY_SLUGS / classifyPage). For each URL we fetch the page and read its real title;
 * if a page can't be fetched we fall back to deriving the title from the slug,
 * which for Archbee is the title kebab-cased, so it stays readable.
 *
 * Run by .github/workflows/docs-index.yml on a nightly schedule — publish an
 * article in Archbee and it shows up in the picker without anyone touching code.
 *
 *   node build-docs-index.mjs                 # fetch sitemap + titles
 *   node build-docs-index.mjs --no-titles     # slug-derived titles only
 *   node build-docs-index.mjs --dry           # print, don't write
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

const SITEMAP = "https://docs.wetransact.io/sitemap.xml";
const ORIGIN = "https://docs.wetransact.io";
const OUT = new URL("./docs-index.json", import.meta.url).pathname;
const CONCURRENCY = 6;
const TIMEOUT_MS = 15000;

const argv = process.argv.slice(2);
const NO_TITLES = argv.includes("--no-titles");
const DRY = argv.includes("--dry");

/* ---------- slug → readable title (fallback, and it's a decent one) ---------- */

const ACRO = {
  id: "ID", ids: "IDs", api: "API", vat: "VAT", tin: "TIN", ein: "EIN",
  csp: "CSP", csps: "CSPs", gtm: "GTM", macc: "MACC", sso: "SSO", ea: "EA",
  mca: "MCA", mpn: "MPN", acr: "ACR", ip: "IP", saas: "SaaS", png: "PNG",
  pdf: "PDF", url: "URL", faq: "FAQ", faqs: "FAQs", crm: "CRM", aom: "AOM",
  us: "US", ai: "AI", sla: "SLA", roi: "ROI", tam: "TAM", p2p: "P2P", csm: "CSM",
};
const PROP = {
  microsoft: "Microsoft", azure: "Azure", entra: "Entra", salesforce: "Salesforce",
  hubspot: "HubSpot", linkedin: "LinkedIn", gmail: "Gmail", outlook: "Outlook",
  wetransact: "WeTransact", warmify: "Warmify", partner: "Partner",
  center: "Center", centre: "Centre", marketplace: "Marketplace",
  global: "Global", admin: "Admin",
};
const QUESTION = new Set([
  "how", "what", "why", "who", "where", "when", "which",
  "can", "do", "does", "is", "are", "should", "could", "will", "have",
]);

export function titleFromSlug(slug) {
  if (!slug) return "WeTransact Docs";
  let s = String(slug)
    .replace(/\.(html?|php)$/i, "")
    .replace(/[_/]+/g, "-")
    .replace(/(\d)([a-z])/gi, "$1-$2")   // "05optimise" → "05-optimise"
    .replace(/([a-z])(\d)/gi, "$1-$2");
  const raw = s.split("-").filter(Boolean);
  if (!raw.length) return "WeTransact Docs";

  const words = raw.map((w) => {
    const lw = w.toLowerCase();
    if (ACRO[lw]) return ACRO[lw];
    if (PROP[lw]) return PROP[lw];
    if (lw === "i") return "I";
    return lw;
  });

  // "step 1 create your…" → "Step 1 — Create your…" (only a leading enumerator,
  // so "48 hour validation" mid-title is left alone)
  let out = [];
  words.forEach((w, i) => {
    out.push(w);
    if (/^\d+$/.test(w) && i >= 1 && i <= 2 && i < words.length - 1) out.push("—");
  });

  let title = out.join(" ").replace(/ — (\S)/g, (m, c) => " — " + c.toUpperCase());
  title = title.replace(/\bco sell\b/gi, "co-sell").replace(/\bcosell\b/gi, "co-sell");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (QUESTION.has(words[0]) && !/[?.!]$/.test(title)) title += "?";
  return title.replace(/\s+/g, " ").trim();
}

/* ---------- fetching ---------- */

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "User-Agent": "wecalendar-docs-index/1.0 (+https://wecalendar.github.io)" },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// Archbee renders the article title into <title> and og:title, usually with a
// site suffix ("… | WeTransact Docs"). Strip the suffix, keep the article name.
function titleFromHtml(html) {
  const pick = (re) => { const m = html.match(re); return m ? decodeEntities(m[1]).trim() : ""; };
  let t =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!t) return "";
  // Drop the site suffix Archbee appends. It can come in layers —
  // "How to X? - WeTransact Docs | Help Center" — so strip until it stops changing.
  const SUFFIX = /\s*[-|·–—]\s*(WeTransact|Docs|Help Center|Documentation)[^-|·–—]*$/i;
  for (let i = 0; i < 4 && SUFFIX.test(t); i++) t = t.replace(SUFFIX, "").trim();
  t = t.replace(/\s+/g, " ").replace(/\s*[-|·–—]\s*$/, "").trim();
  if (!t || /^(untitled|docs|home|documentation|wetransact|wetransact docs|wetransact documentation|help center)$/i.test(t)) return "";
  return t.length > 140 ? t.slice(0, 137).trimEnd() + "…" : t;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try { out[idx] = await fn(items[idx], idx); } catch { out[idx] = null; }
      }
    })
  );
  return out;
}

/* ---------- build ---------- */

const SKIP_SLUG = /^(untitled|)$/i;

/* ---------- category / section pages ----------
 * The sitemap lists Archbee *category* pages next to real articles ("Azure
 * Portal User Rights" is a folder; the how-tos inside it are the articles).
 * The picker must offer articles only — Ruby, 2026-08-26.
 *
 * Two filters, belt and braces:
 *  1. CATEGORY_SLUGS — the ones known today (audited against the rendered PDFs).
 *  2. classifyPage()  — catches new ones: an Archbee category page is a stack of
 *     "Read more >" cards, so lots of Read-more links over very little prose.
 * Anything dropped is printed, so a false positive is visible in the run log.
 */
const CATEGORY_SLUGS = new Set([
  "azure-marketplace-procurement-guide",       // section page, no article body
  "azure-portal-user-rights",
  "crm-connectors",
  "faqs",
  "finance-and-order",
  "go-live-in-5-days-with-your-csm",
  "gtm-go-to-market",
  "how-do-i-enrol-for-the-incentive-campaign", // index of Part 1-4
  "incentive",
  "ip-co-sellpartnership",
  "partner-center-day-to-day",
  "partner-center-user-rights",
  "partner-centerazure-user-rights",
  "private-plan-and-private-offer-setup",      // section page, no article body
  "selling-and-offer-management",
  "troubleshooting",
  "video-masterclasses",
  "wetransact-portal-day-to-day",
]);

// Slugs that look like categories but are real articles — never auto-drop these.
const NEVER_CATEGORY = new Set([
  "deal-registration-consent-and-troubleshooting-guide",
]);

function bodyText(html) {
  let h = String(html);
  const at = h.search(/id=["']STRIPE_TEMPLATE_EDITOR["']/i);
  if (at > -1) h = h.slice(at);                       // article body onwards
  return h
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyPage(html) {
  const at = String(html).search(/id=["']STRIPE_TEMPLATE_EDITOR["']/i);
  const body = at > -1 ? String(html).slice(at) : String(html);
  const cards = (body.match(/read\s*more\s*(?:&gt;|>|›|»)?/gi) || []).length;
  const words = bodyText(html).split(" ").filter(Boolean).length;
  if (!cards) return { cat: false };
  if (cards >= 2 && words / cards < 140) return { cat: true, why: `${cards} "Read more" cards over ${words} words` };
  if (cards >= 1 && words < 140) return { cat: true, why: `link-only page (${words} words)` };
  return { cat: false };
}

async function main() {
  let urls = [];
  try {
    const xml = await get(SITEMAP);
    urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  } catch (e) {
    console.error("sitemap fetch failed:", e.message);
    process.exitCode = 1;
    return;
  }

  const seen = new Set();
  const items = [];
  for (const u of urls) {
    if (!u.startsWith(ORIGIN)) continue;
    const slug = u.slice(ORIGIN.length).replace(/^\/+|\/+$/g, "");
    if (!slug || SKIP_SLUG.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ slug, title: titleFromSlug(slug) });
  }

  if (!items.length) {
    console.error("sitemap parsed but no article URLs found — refusing to write an empty index");
    process.exitCode = 1;
    return;
  }

  if (!NO_TITLES) {
    let real = 0;
    await mapLimit(items, CONCURRENCY, async (it) => {
      try {
        const html = await get(ORIGIN + "/" + it.slug);
        const t = titleFromHtml(html);
        if (t) { it.title = t; real++; }
        if (!NEVER_CATEGORY.has(it.slug)) {
          const c = classifyPage(html);
          if (c.cat) it._cat = c.why;
        }
      } catch { /* keep the slug-derived title */ }
    });
    console.error(`titles: ${real} live / ${items.length - real} derived from slug`);
  }

  /* Articles only — categories are folders, their articles are already listed. */
  const dropped = [];
  const articles = items.filter((it) => {
    const why = CATEGORY_SLUGS.has(it.slug) ? "known category page" : it._cat;
    if (why) { dropped.push(`${it.slug} — ${why}`); return false; }
    return true;
  });
  if (dropped.length) console.error(`skipped ${dropped.length} category pages:\n  ` + dropped.join("\n  "));
  if (articles.length < items.length * 0.55) {
    console.error(`category filter dropped ${dropped.length} of ${items.length} — refusing to write`);
    process.exitCode = 1;
    return;
  }
  articles.forEach((it) => { delete it._cat; });

  articles.sort((a, b) => a.title.localeCompare(b.title, "en"));

  const payload = { source: SITEMAP, count: articles.length, docs: articles };
  const json = JSON.stringify(payload, null, 1) + "\n";

  // Guard against a bad run wiping a good index (e.g. docs site half-down).
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, "utf8"));
      const prevCount = (prev.docs || []).length;
      if (prevCount > 20 && articles.length < prevCount * 0.6) {
        console.error(`refusing to shrink index from ${prevCount} to ${articles.length} — treating as a bad fetch`);
        process.exitCode = 1;
        return;
      }
    } catch { /* unreadable previous index — just overwrite */ }
  }

  if (DRY) { console.log(json); return; }
  writeFileSync(OUT, json);
  console.error(`wrote docs-index.json — ${articles.length} articles`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
