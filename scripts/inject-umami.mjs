/**
 * Injects the Umami analytics tag into index.html at build time.
 *
 * Analytics are entirely optional: with no UMAMI_WEBSITE_ID in the environment
 * the marker block is emptied and the page ships without any tracking script,
 * so local development and forks stay clean. Vercel runs this as the build
 * command, where the environment variables are available.
 *
 *   UMAMI_WEBSITE_ID   enables analytics (the site's UUID from the dashboard)
 *   UMAMI_SCRIPT_URL   optional; script.js URL or the instance base URL
 *   UMAMI_DOMAINS      optional; comma-separated hosts to restrict tracking to
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DEFAULT_SCRIPT_URL = "https://linesofcode-umami.vercel.app/script.js";
const START = "<!-- umami -->";
const END = "<!-- /umami -->";

const escapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Accepts either a full script URL or an instance base URL. */
export function resolveScriptUrl(raw) {
  const value = (raw || "").trim() || DEFAULT_SCRIPT_URL;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`UMAMI_SCRIPT_URL is not a valid URL: ${value}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`UMAMI_SCRIPT_URL must be http(s): ${value}`);
  }
  if (!url.pathname.endsWith(".js")) {
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/script.js`;
  }
  return url.href;
}

/** Returns the <script> tag for the given environment, or "" when disabled. */
export function renderUmamiTag(env = process.env) {
  const websiteId = (env.UMAMI_WEBSITE_ID || "").trim();
  if (!websiteId) return "";
  if (!/^[A-Za-z0-9._~-]{1,128}$/.test(websiteId)) {
    throw new Error("UMAMI_WEBSITE_ID contains unexpected characters");
  }
  const domains = (env.UMAMI_DOMAINS || "").trim();
  return (
    `<script defer src="${escapeAttr(resolveScriptUrl(env.UMAMI_SCRIPT_URL))}"` +
    ` data-website-id="${escapeAttr(websiteId)}"` +
    (domains ? ` data-domains="${escapeAttr(domains)}"` : "") +
    `></script>`
  );
}

/** Replaces the contents of the marker block. Idempotent. */
export function injectUmami(html, env = process.env) {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`index.html must contain the ${START} … ${END} marker block`);
  }
  const tag = renderUmamiTag(env);
  return html.slice(0, start + START.length) + (tag ? `\n${tag}\n` : "\n") + html.slice(end);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const file = join(dirname(dirname(fileURLToPath(import.meta.url))), "index.html");
  const before = readFileSync(file, "utf8");
  const after = injectUmami(before);
  if (after !== before) writeFileSync(file, after);
  console.log(
    process.env.UMAMI_WEBSITE_ID
      ? `umami: analytics enabled via ${resolveScriptUrl(process.env.UMAMI_SCRIPT_URL)}`
      : "umami: UMAMI_WEBSITE_ID not set — shipping without analytics",
  );
}
