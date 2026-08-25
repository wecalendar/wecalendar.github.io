#!/usr/bin/env node
/*
 * Renders every article on docs.wetransact.io into a WeTransact-branded PDF,
 * so the WeCalendar add-in can attach one to an email the way it attaches the
 * onboarding playbook.
 *
 * Output: docs-pdf/<slug>.pdf  +  docs-pdf/manifest.json
 *
 * The manifest carries the stamp coordinates the client uses to write
 * "Prepared for {Company}" and the CSM/booking footer onto page 1 with pdf-lib,
 * so the layout and the stamping never drift apart.
 *
 * Only articles whose content changed are re-rendered (content hash in the
 * manifest), which keeps the nightly run cheap and the repo history small.
 *
 *   node build-docs-pdfs.mjs                  # render what changed
 *   node build-docs-pdfs.mjs --all            # force re-render everything
 *   node build-docs-pdfs.mjs --limit=3        # first N only (for a smoke test)
 *   node build-docs-pdfs.mjs --only=slug,slug # just these
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import puppeteer from "puppeteer";
import sharp from "sharp";

const ROOT = new URL("./", import.meta.url).pathname;
const OUT_DIR = path.join(ROOT, "docs-pdf");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const INDEX = path.join(ROOT, "docs-index.json");
const ORIGIN = "https://docs.wetransact.io";

const argv = process.argv.slice(2);
const FORCE = argv.includes("--all");
const LIMIT = Number((argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);
const ONLY = ((argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

/* ---------- page geometry (A4) — the client stamps against these ---------- */
const PX_PER_MM = 96 / 25.4;          // CSS px per mm
const PT_PER_PX = 0.75;               // 96dpi CSS px → PDF points
const PAGE_H_PT = 841.89;             // A4 height
const MARGIN = { top: 17, bottom: 15, side: 15 };   // mm
const CONTENT_W_PX = Math.round((210 - MARGIN.side * 2) * PX_PER_MM);   // 680
const MARGIN_TOP_PX = MARGIN.top * PX_PER_MM;
const MARGIN_SIDE_PX = MARGIN.side * PX_PER_MM;

/* ---------- assets ---------- */
const b64 = (p) => readFileSync(path.join(ROOT, p)).toString("base64");
const FONT_BOLD = b64("GreycliffCF-Bold.ttf");
const FONT_MED = b64("GreycliffCF-Medium.ttf");
const LOGO = b64("wt-logo.png");

export const GEOM = { PX_PER_MM, PT_PER_PX, PAGE_H_PT, MARGIN, CONTENT_W_PX, MARGIN_TOP_PX, MARGIN_SIDE_PX };

export const CSS = `
@font-face{font-family:'Greycliff CF';src:url(data:font/ttf;base64,${FONT_MED}) format('truetype');font-weight:500;font-display:block}
@font-face{font-family:'Greycliff CF';src:url(data:font/ttf;base64,${FONT_BOLD}) format('truetype');font-weight:700;font-display:block}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{width:${CONTENT_W_PX}px;font-family:'Greycliff CF',-apple-system,'Segoe UI',sans-serif;font-weight:500;
  font-size:11.4px;line-height:1.58;color:#343130;-webkit-print-color-adjust:exact;print-color-adjust:exact}
img.logo{display:block;height:26px;width:auto;margin:0 auto}
.kicker{height:13px;margin:13px 0 0;font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#5E43C8}
/* stamp band — kept empty on purpose; the add-in writes "Prepared for X" here */
#preparedFor{height:19px;margin:0 0 3px}
h1.doc{margin:0;font-size:25px;line-height:1.2;font-weight:700;color:#2C1C6C;letter-spacing:-.01em}
.src{margin:9px 0 0;font-size:9px;color:#9191A4}
.src a{color:#9191A4;text-decoration:none}
.rule{height:1px;background:#E2DBFF;margin:15px 0 19px}
h2,h3,h4{color:#2C1C6C;font-weight:700;line-height:1.3;margin:20px 0 7px;page-break-after:avoid}
h2{font-size:16px}h3{font-size:13.5px}h4{font-size:12px}
p{margin:0 0 9px}
a{color:#5E43C8;text-decoration:underline;word-break:break-word}
ul,ol{margin:0 0 10px;padding-left:19px}
li{margin:0 0 5px}
img{max-width:88%;height:auto;display:block;margin:10px 0;border:1px solid #E2DBFF;border-radius:9px;page-break-inside:avoid}
figure{margin:12px 0}figcaption{font-size:9.5px;color:#656578;margin-top:4px}
blockquote{margin:12px 0;padding:9px 13px;border-left:3px solid #C9BCFF;background:#FBF9FF;border-radius:0 9px 9px 0}
code{font-family:ui-monospace,Menlo,monospace;font-size:10px;background:#F2EEFF;padding:1px 4px;border-radius:4px}
pre{background:#FBF9FF;border:1px solid #E2DBFF;border-radius:9px;padding:11px;overflow:hidden;page-break-inside:avoid}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:10.5px;page-break-inside:avoid}
th,td{border:1px solid #E2DBFF;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#F2EEFF;color:#2C1C6C;font-weight:700}
hr{border:none;height:1px;background:#E2DBFF;margin:16px 0}
.embed{margin:12px 0;padding:11px 13px;background:#FBF9FF;border:1px dashed #C9BCFF;border-radius:9px;font-size:10.5px}
.end{margin-top:22px;padding-top:11px;border-top:1px solid #E2DBFF;font-size:9.5px;color:#656578}
`;

export const FOOTER = `<div style="width:100%;font-family:sans-serif;font-size:7.5pt;color:#9191A4;
  padding:0 ${MARGIN.side}mm;display:flex;justify-content:flex-end;">
  <span>docs.wetransact.io &nbsp;·&nbsp; <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;

/* ---------- html sanitising ---------- */
const KEEP = new Set(["p","br","hr","strong","b","em","i","u","s","code","pre","blockquote","ul","ol","li",
  "h1","h2","h3","h4","h5","h6","table","thead","tbody","tr","th","td","a","img","figure","figcaption","span","div","sup","sub"]);

export function sanitize(html) {
  let s = String(html);
  s = s.replace(/<(script|style|noscript|svg|button|input|form)[\s\S]*?<\/\1>/gi, "");
  // videos and embeds can't print — leave a link instead
  s = s.replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi,
    (_, src) => `<div class="embed">Video: <a href="${src}">${src}</a></div>`);
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  // drop every attribute except the few that carry meaning
  s = s.replace(/<([a-z0-9]+)((?:\s+[^>]*)?)>/gi, (m, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!KEEP.has(t)) return `<${t === "section" || t === "article" ? "div" : t}>`;
    let keep = "";
    if (t === "a") {
      const href = (attrs.match(/\shref=["']([^"']*)["']/i) || [])[1];
      if (href) keep += ` href="${href.startsWith("/") ? ORIGIN + href : href}"`;
    }
    if (t === "ol") {
      // Archbee wraps every step in its own <ol start="N"> — keep that number,
      // otherwise each step restarts at 1.
      const st = (attrs.match(/\sstart=["']?(\d+)["']?/i) || [])[1];
      if (st) keep += ` start="${st}"`;
    }
    if (t === "img") {
      const src = (attrs.match(/\ssrc=["']([^"']*)["']/i) || [])[1];
      const alt = (attrs.match(/\salt=["']([^"']*)["']/i) || [])[1];
      if (!src) return "";
      keep += ` src="${src}"`;
      if (alt) keep += ` alt="${alt}"`;
    }
    return `<${t}${keep}>`;
  });
  s = s.replace(/<\/(section|article)>/gi, "</div>");
  s = s.replace(/(&nbsp;|\s)+/g, " ");
  s = s.replace(/<div>\s*<\/div>/g, "").replace(/<p>\s*<\/p>/g, "");
  s = s.replace(/<li>\s*<\/li>/g, "").replace(/<span>\s*<\/span>/g, "");
  s = s.replace(/<(ul|ol)>\s*<\/\1>/g, "");
  // Archbee puts each step in its own <ol>, so numbering restarted at 1 for
  // every item once the classes were gone. Merge adjacent lists of a kind.
  for (let i = 0; i < 40; i++) {
    const merged = s.replace(/<\/(ul|ol)>\s*(?:<div>\s*<\/div>\s*)*<\1>/g, "");
    if (merged === s) break;
    s = merged;
  }
  return s.trim();
}

/* ---------- images: shrink hard, inline as data URIs ---------- */
async function inlineImages(html) {
  const srcs = [...new Set([...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]))];
  for (const src of srcs) {
    try {
      const r = await fetch(src, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if ((meta.width || 0) < 60 && (meta.height || 0) < 60) {   // spacers / tiny icons
        html = html.split(`<img src="${src}"`).join(`<img data-drop="1" src="${src}"`);
        continue;
      }
      const out = await sharp(buf).rotate()
        .resize({ width: Math.min(meta.width || 900, 900), withoutEnlargement: true })
        .flatten({ background: "#FFFFFF" })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      html = html.split(src).join(`data:image/jpeg;base64,${out.toString("base64")}`);
    } catch {
      html = html.split(`<img src="${src}"`).join(`<img data-drop="1" src="${src}"`);
    }
  }
  return html.replace(/<img data-drop="1"[^>]*>/g, "");
}

/* ---------- instruction blurbs (shown in the email next to the PDF) ----------
   Written here, once per article, never at click time. Two sources:
   - "steps": the article's own h2/h3 headings, joined into one sentence —
     free, deterministic, always accurate.
   - "ai": a 2-3 sentence email-ready blurb from the Anthropic API, used only
     when ANTHROPIC_API_KEY is set (GitHub Actions secret). Validated hard;
     any failure falls back to the step list, so the text can't be wrong. */

const BLURB_V = 2;   // bump to regenerate every blurb on the next run

export function stepsBlurb(heads) {
  const hs = (heads || [])
    .map((h) => String(h)
      .replace(/\((?:https?:\/\/|www\.)[^)]*\)/gi, "")     // "(https://…)" asides
      .replace(/(?:https?:\/\/|www\.)\S+/gi, "")            // bare URLs
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, "")  // emoji/markers
      .replace(/^\s*(?:step\s*)?\d+\s*[.)\-:]\s*/i, "")   // leading "1." / "Step 2:"
      .replace(/\s+/g, " ").replace(/[.:,;\s]+$/, "").trim())
    .filter((h) => h.length > 2 && h.length < 90)
    .slice(0, 5);
  if (!hs.length) return "The attached guide walks you through it step by step.";
  let out = hs;
  while (out.length > 1 && ("The attached guide covers: " + out.join(" → ") + ".").length > 320) out = out.slice(0, -1);
  return "The attached guide covers: " + out.join(" → ") + (out.length < hs.length ? " → …" : ".");
}

export function validBlurb(t) {
  if (typeof t !== "string") return false;
  const s = t.replace(/\s+/g, " ").trim();
  return s.length >= 40 && s.length <= 450 && !/https?:\/\//i.test(s) && !/[\[\]{}<>]/.test(s);
}

async function aiBlurb(title, text) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.BLURB_MODEL || "claude-haiku-4-5",
        max_tokens: 250,
        system: "You write one short blurb for an email a WeTransact CSM sends a client, introducing an attached how-to guide. 2-3 sentences, at most 400 characters, plain text only: no URLs, no markdown, no brackets, no greeting, no sign-off. Warm, concrete, 'you/we'll' tone. Say who must act (e.g. your Global Admin) and what they'll do; mention a rough duration only if the guide implies one. Reply with the blurb alone.",
        messages: [{ role: "user", content: "Guide title: " + title + "\n\nGuide content:\n" + String(text).slice(0, 6000) }],
      }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const out = ((j.content || [])[0] || {}).text || "";
    const clean = out.replace(/\s+/g, " ").trim();
    return validBlurb(clean) ? clean : null;
  } catch (e) {
    console.error("  blurb API failed for " + title + ": " + e.message);
    return null;
  }
}

async function makeBlurb(title, text, heads) {
  const ai = await aiBlurb(title, text);
  if (ai) return { blurb: ai, blurbSrc: "ai" };
  return { blurb: stepsBlurb(heads), blurbSrc: "steps" };
}

/* ---------- extract one article ---------- */
async function extract(page, slug) {
  await page.goto(`${ORIGIN}/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => {
      i.loading = "eager";
      const ds = i.getAttribute("data-src") || i.getAttribute("data-lazy-src");
      if (ds && !i.src.startsWith("data:")) i.src = ds;
    });
    // walk the page so anything still lazy comes in
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.querySelectorAll("img")].map((i) =>
      i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
  });
  return page.evaluate(() => {
    const h1 = document.querySelector("h1.ab-doc-name");
    const body = document.querySelector("#STRIPE_TEMPLATE_EDITOR");
    return {
      title: h1 ? h1.innerText.trim() : "",
      html: body ? body.innerHTML : "",
      text: body ? body.innerText.replace(/\s+/g, " ").trim() : "",
      heads: body ? [...body.querySelectorAll("h2,h3")].map((h) => h.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 8) : [],
    };
  });
}

/* ---------- render the branded PDF ---------- */
export function buildDocHtml({ slug, title, html }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
    <img class="logo" src="data:image/png;base64,${LOGO}" alt="WeTransact">
    <div class="kicker">WeTransact Docs</div>
    <div id="preparedFor"></div>
    <h1 class="doc">${title.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</h1>
    <div class="src"><a href="https://docs.wetransact.io/${slug}">docs.wetransact.io/${slug}</a></div>
    <div class="rule"></div>
    <div class="content">${html}</div>
    <div class="end">Always-current version of this guide: <a href="https://docs.wetransact.io/${slug}">docs.wetransact.io/${slug}</a> &nbsp;·&nbsp; Questions? Reply to this email and your CSM will pick it up.</div>
  </body></html>`;
}

export function stampFromBand(band) {
  return {
    preparedFor: {
      x: +((MARGIN_SIDE_PX + band.left) * PT_PER_PX).toFixed(2),
      y: +(PAGE_H_PT - (MARGIN_TOP_PX + band.top + band.height - 4.5) * PT_PER_PX).toFixed(2),
      size: 12.5,
      maxWidth: +(CONTENT_W_PX * PT_PER_PX).toFixed(2),
    },
    footer: {
      x: +(MARGIN_SIDE_PX * PT_PER_PX).toFixed(2),
      y: 22,
      size: 8,
      maxWidth: +(CONTENT_W_PX * PT_PER_PX * 0.62).toFixed(2),
    },
  };
}

async function render(page, { slug, title, html }) {
  const doc = buildDocHtml({ slug, title, html });

  await page.setViewport({ width: CONTENT_W_PX, height: 1000 });
  await page.setContent(doc, { waitUntil: "load", timeout: 60000 });

  // Anchors already print as clickable links; bare addresses typed into the
  // article don't, so turn those into anchors too before printing.
  await page.evaluate(() => {
    const RX = /((?:https?:\/\/|www\.)[^\s<>()\[\]"']+[^\s<>()\[\]"'.,;:!?])/g;
    const root = document.querySelector(".content");
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const targets = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement && n.parentElement.closest("a")) continue;
      if (RX.test(n.nodeValue)) targets.push(n);
      RX.lastIndex = 0;
    }
    targets.forEach((n) => {
      const frag = document.createDocumentFragment();
      let last = 0, m;
      RX.lastIndex = 0;
      while ((m = RX.exec(n.nodeValue))) {
        if (m.index > last) frag.appendChild(document.createTextNode(n.nodeValue.slice(last, m.index)));
        const a = document.createElement("a");
        a.href = m[1].startsWith("www.") ? "https://" + m[1] : m[1];
        a.textContent = m[1];
        frag.appendChild(a);
        last = m.index + m[1].length;
      }
      if (last < n.nodeValue.length) frag.appendChild(document.createTextNode(n.nodeValue.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  });

  await page.evaluateHandle("document.fonts.ready");

  // where the empty band sits, in PDF points — the client stamps here
  const band = await page.evaluate(() => {
    const r = document.getElementById("preparedFor").getBoundingClientRect();
    return { top: r.top, left: r.left, height: r.height };
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: FOOTER,
    margin: { top: `${MARGIN.top}mm`, bottom: `${MARGIN.bottom}mm`, left: `${MARGIN.side}mm`, right: `${MARGIN.side}mm` },
  });

  return { pdf, stamp: stampFromBand(band) };
}

/* ---------- main ---------- */
const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 90);

async function main() {
  if (!existsSync(INDEX)) { console.error("docs-index.json missing — run build-docs-index.mjs first"); process.exitCode = 1; return; }
  const docs = (JSON.parse(readFileSync(INDEX, "utf8")).docs || []).filter((d) => d.slug);
  if (!docs.length) { console.error("empty index"); process.exitCode = 1; return; }

  mkdirSync(OUT_DIR, { recursive: true });
  let prev = { docs: {} };
  if (existsSync(MANIFEST)) { try { prev = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch {} }

  let list = docs;
  if (ONLY.length) list = list.filter((d) => ONLY.includes(d.slug));
  if (LIMIT) list = list.slice(0, LIMIT);

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const out = { generated: new Date().toISOString().slice(0, 10), stamp: prev.stamp || null, docs: { ...(prev.docs || {}) } };
  let rendered = 0, skipped = 0, failed = 0, blurbed = 0;

  for (const d of list) {
    const file = path.join(OUT_DIR, `${d.slug}.pdf`);
    try {
      const art = await extract(page, d.slug);
      if (!art.html || art.text.length < 40) throw new Error("no article body found");
      const title = art.title || d.title;
      const hash = createHash("sha1").update(title + "|" + art.text).digest("hex").slice(0, 16);

      if (!FORCE && prev.docs?.[d.slug]?.hash === hash && existsSync(file)) {
        const entry = { ...prev.docs[d.slug] };
        // fill a missing blurb, and upgrade a step-list one to AI wording
        // once a key exists — without re-rendering the PDF
        if (!entry.blurb || entry.blurbV !== BLURB_V || (process.env.ANTHROPIC_API_KEY && entry.blurbSrc !== "ai")) {
          const b = await makeBlurb(title, art.text, art.heads);
          entry.blurb = b.blurb; entry.blurbSrc = b.blurbSrc; entry.blurbV = BLURB_V;
          blurbed++;
        }
        out.docs[d.slug] = entry;
        skipped++;
        continue;
      }

      const html = await inlineImages(sanitize(art.html));
      const { pdf, stamp } = await render(page, { slug: d.slug, title, html });
      writeFileSync(file, pdf);
      out.stamp = stamp;
      const b = await makeBlurb(title, art.text, art.heads);
      out.docs[d.slug] = { title, hash, bytes: pdf.length, file: `docs-pdf/${d.slug}.pdf`, blurb: b.blurb, blurbSrc: b.blurbSrc, blurbV: BLURB_V };
      rendered++; blurbed++;
      console.error(`✓ ${d.slug} — ${(pdf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      failed++;
      console.error(`✗ ${d.slug} — ${e.message}`);
      if (prev.docs?.[d.slug] && existsSync(file)) out.docs[d.slug] = prev.docs[d.slug];
    }
  }

  await browser.close();

  // drop PDFs for articles that no longer exist
  const live = new Set(docs.map((d) => d.slug));
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith(".pdf")) continue;
    const slug = f.slice(0, -4);
    if (!live.has(slug)) { unlinkSync(path.join(OUT_DIR, f)); delete out.docs[slug]; console.error(`- removed ${f} (gone from the docs site)`); }
  }

  out.count = Object.keys(out.docs).length;
  writeFileSync(MANIFEST, JSON.stringify(out, null, 1) + "\n");
  const total = Object.values(out.docs).reduce((n, d) => n + (d.bytes || 0), 0);
  console.error(`rendered ${rendered}, unchanged ${skipped}, failed ${failed}, blurbs written ${blurbed} — ${out.count} PDFs, ${(total / 1048576).toFixed(1)} MB total`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
