#!/usr/bin/env node
/**
 * WCAG contrast check for the panel's design tokens.
 *
 * Reads the `:root` (light) and `.dark` blocks straight out of app/globals.css,
 * resolves `var()` references and prints the contrast ratio of every pair the
 * UI actually renders. Exits non-zero when a required pair fails, so it can
 * gate a token change:
 *
 *   node scripts/check-contrast.mjs          # table for both themes
 *   node scripts/check-contrast.mjs --fails  # only the failing rows
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) {
    throw new Error(`selector ${selector} not found`);
  }
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const body = css.slice(open + 1, close);
  const tokens = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

function resolve(tokens, name, depth = 0) {
  const raw = tokens[name];
  if (raw == null || depth > 8) {
    return null;
  }
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolve(tokens, ref[1], depth + 1) : raw;
}

function hexToRgb(hex) {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = Number.parseInt(value.slice(0, 6), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum, note] — 4.5 = body text, 3 = large text / UI. */
const PAIRS = [
  ["ink", "canvas", 4.5, "body text on page"],
  ["ink", "bg", 4.5, "body text on card"],
  ["ink", "elevated", 4.5, "text in menus / modals"],
  ["ink", "surface", 4.5, "text on quiet fill"],
  ["fg-muted", "canvas", 4.5, "secondary text on page"],
  ["fg-muted", "bg", 4.5, "secondary text on card"],
  ["fg-muted", "surface", 4.5, "muted badge"],
  ["fg-muted", "surface-strong", 4.5, "sidebar hover"],
  ["fg-subtle", "canvas", 4.5, "hint text on page"],
  ["fg-subtle", "bg", 4.5, "hint text on card"],
  ["fg-subtle", "surface-subtle", 4.5, "table header labels"],
  ["fg-subtle", "elevated", 4.5, "hint text in menus"],
  ["accent-ink", "bg", 4.5, "link on card"],
  ["accent-ink", "canvas", 4.5, "link on page"],
  ["accent", "bg", 3, "accent icon / focus ring on card"],
  ["accent", "canvas", 3, "focus ring on page"],
  ["on-accent", "accent", 4.5, "primary button label"],
  ["on-accent", "accent-hover", 4.5, "primary button hover"],
  ["accent-on-surface", "accent-surface", 4.5, "accent badge / active nav"],
  ["accent-on-surface", "accent-tint", 4.5, "accent callout"],
  ["success-ink", "success-surface", 4.5, "success badge / callout"],
  ["success", "bg", 3, "success icon"],
  ["warn-ink", "warn-surface", 4.5, "warning badge / callout"],
  ["warn", "bg", 3, "warning icon / bar"],
  ["danger", "bg", 4.5, "error text on card"],
  ["danger", "danger-surface", 4.5, "danger button (soft)"],
  ["danger-ink", "danger-surface", 4.5, "danger badge / callout"],
  ["on-accent", "danger", 4.5, "danger button (solid)"],
  ["info-ink", "info-surface", 4.5, "info badge / callout"],
  ["info", "bg", 3, "info icon"],
  ["on-inverse", "inverse", 4.5, "inverse block"],
  ["on-inverse-dim", "inverse", 4.5, "inverse block, secondary"],
  ["switch-knob", "accent", 1.4, "switch knob on track (shape carries state)"],
  ["chart-1", "bg", 3, "chart series 1"],
  ["chart-2", "bg", 3, "chart series 2"],
  ["chart-3", "bg", 3, "chart series 3"],
  ["chart-4", "bg", 3, "chart series 4"],
  ["chart-5", "bg", 3, "chart series 5"],
];

const onlyFails = process.argv.includes("--fails");
let failures = 0;

for (const [mode, tokens] of [
  ["light", light],
  ["dark", dark],
]) {
  console.log(`\n${mode.toUpperCase()}`);
  console.log("  ratio   min   result  pair");
  for (const [fg, bg, min, note] of PAIRS) {
    const a = resolve(tokens, fg);
    const b = resolve(tokens, bg);
    if (!a?.startsWith("#") || !b?.startsWith("#")) {
      console.log(`  —       ${String(min).padEnd(4)}  skip    ${fg} on ${bg} (non-hex)`);
      continue;
    }
    const value = ratio(a, b);
    const pass = value >= min;
    if (!pass) {
      failures += 1;
    }
    if (onlyFails && pass) {
      continue;
    }
    console.log(
      `  ${value.toFixed(2).padStart(5)}  ${String(min).padEnd(4)}  ${pass ? "PASS" : "FAIL"}    ${fg} ${a} on ${bg} ${b} — ${note}`,
    );
  }
}

console.log(failures === 0 ? "\nAll pairs pass." : `\n${failures} pair(s) below target.`);
process.exit(failures === 0 ? 0 : 1);
