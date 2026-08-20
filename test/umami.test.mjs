/**
 * Tests for the optional Umami analytics injection (scripts/inject-umami.mjs).
 *
 * The important property is that analytics stay optional: no website id in the
 * environment must leave index.html script-free.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { injectUmami, renderUmamiTag, resolveScriptUrl } from "../scripts/inject-umami.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const ID = "b44dda50-b9c2-444f-8e15-acec6182afda";

test("index.html carries the marker block the build writes into", () => {
  assert.match(html, /<!-- umami -->[\s\S]*?<!-- \/umami -->/);
});

test("no website id means no analytics at all", () => {
  assert.equal(renderUmamiTag({}), "");
  const out = injectUmami(html, {});
  assert.ok(!/umami/i.test(out.replace(/<!-- \/?umami -->/g, "")), "page must ship script-free");
});

test("a website id emits a deferred tag pointing at the hosted instance", () => {
  const tag = renderUmamiTag({ UMAMI_WEBSITE_ID: ID });
  assert.match(tag, /^<script defer src="https:\/\/linesofcode-umami\.vercel\.app\/script\.js"/);
  assert.match(tag, new RegExp(`data-website-id="${ID}"`));
  assert.ok(!tag.includes("data-domains"));
});

test("a base URL is resolved to script.js, a full URL is left alone", () => {
  assert.equal(resolveScriptUrl("https://u.example.com/"), "https://u.example.com/script.js");
  assert.equal(resolveScriptUrl("https://u.example.com"), "https://u.example.com/script.js");
  assert.equal(resolveScriptUrl("https://u.example.com/a.js"), "https://u.example.com/a.js");
});

test("domains are passed through when set", () => {
  const tag = renderUmamiTag({ UMAMI_WEBSITE_ID: ID, UMAMI_DOMAINS: "termenvox.vercel.app" });
  assert.match(tag, /data-domains="termenvox\.vercel\.app"/);
});

test("hostile values are rejected rather than injected into the page", () => {
  assert.throws(() => renderUmamiTag({ UMAMI_WEBSITE_ID: '"><script>alert(1)</script>' }));
  assert.throws(() => renderUmamiTag({ UMAMI_WEBSITE_ID: ID, UMAMI_SCRIPT_URL: "javascript:alert(1)" }));
  assert.throws(() => renderUmamiTag({ UMAMI_WEBSITE_ID: ID, UMAMI_SCRIPT_URL: "not a url" }));
});

test("injection is idempotent and reversible", () => {
  const env = { UMAMI_WEBSITE_ID: ID };
  const once = injectUmami(html, env);
  assert.equal(injectUmami(once, env), once);
  assert.equal(injectUmami(once, {}), injectUmami(html, {}));
});

test("a page without the markers fails loudly", () => {
  assert.throws(() => injectUmami("<html></html>", {}), /marker block/);
});
