#!/usr/bin/env node
/**
 * Vendors the curated QR-logo emoji pack from Twemoji into
 * `lib/qr-logo-emoji.generated.ts` (catalogue) and `lib/qr-logo-emoji-svg.generated.ts`
 * (artwork), so the panel never depends on a CDN at runtime and
 * the server can rasterize emoji with sharp (Alpine ships no colour emoji font).
 *
 *   node apps/web/scripts/generate-qr-logo-emoji.mjs            # latest Twemoji release
 *   TWEMOJI_VERSION=17.0.3 node apps/web/scripts/generate-qr-logo-emoji.mjs
 *
 * Twemoji artwork: Copyright 2019 Twitter, Inc and other contributors (jdecked/twemoji
 * fork), licensed CC-BY 4.0 — https://creativecommons.org/licenses/by/4.0/. The
 * attribution is written into the generated file's header and must stay there.
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_OUTPUT = join(here, "..", "lib", "qr-logo-emoji.generated.ts");
const ARTWORK_OUTPUT = join(here, "..", "lib", "qr-logo-emoji-svg.generated.ts");

/** Twemoji file name (code points, FE0F dropped) plus English and Turkish names. */
const EMOJI = [
  ["1f600", "Grinning face", "Sırıtan yüz", "smile happy gülen mutlu"],
  ["1f602", "Tears of joy", "Sevinç gözyaşları", "laugh lol kahkaha gülmek"],
  ["1f60d", "Heart eyes", "Kalp gözler", "love aşk sevgi"],
  ["1f60e", "Sunglasses", "Güneş gözlüklü", "cool havalı"],
  ["1f609", "Winking face", "Göz kırpan", "wink göz kırpma"],
  ["1f929", "Star-struck", "Hayran", "wow star yıldız"],
  ["1f973", "Partying face", "Parti yüzü", "party celebrate kutlama"],
  ["1f914", "Thinking face", "Düşünen yüz", "hmm question soru"],
  ["1f44d", "Thumbs up", "Beğeni", "like ok onay"],
  ["1f44f", "Clapping hands", "Alkış", "applause bravo"],
  ["1f64c", "Raising hands", "Eller havada", "hooray yaşasın"],
  ["1f64f", "Folded hands", "Teşekkür", "thanks please rica dua"],
  ["1f44b", "Waving hand", "El sallama", "hello hi merhaba selam"],
  ["270c", "Victory hand", "Zafer işareti", "peace barış"],
  ["1f4aa", "Flexed biceps", "Pazı", "strong gym güçlü spor"],
  ["2764", "Red heart", "Kırmızı kalp", "love aşk sevgi"],
  ["1f525", "Fire", "Ateş", "hot lit sıcak"],
  ["2728", "Sparkles", "Parıltı", "new magic yeni sihir"],
  ["2b50", "Star", "Yıldız", "favourite favori"],
  ["1f4af", "Hundred points", "Yüz puan", "perfect score mükemmel"],
  ["1f389", "Party popper", "Konfeti", "celebrate tada kutlama"],
  ["1f381", "Gift", "Hediye", "present sürpriz"],
  ["1f382", "Birthday cake", "Doğum günü pastası", "birthday doğum günü"],
  ["1f388", "Balloon", "Balon", "party parti"],
  ["1f451", "Crown", "Taç", "king queen vip kral"],
  ["1f48e", "Gem", "Mücevher", "diamond elmas"],
  ["1f3c6", "Trophy", "Kupa", "winner award ödül"],
  ["1f680", "Rocket", "Roket", "launch startup başlat"],
  ["1f4a1", "Light bulb", "Ampul", "idea fikir"],
  ["1f514", "Bell", "Zil", "notification bildirim"],
  ["2705", "Check mark", "Onay işareti", "done ok tamam"],
  ["1f4cd", "Round pushpin", "Konum iğnesi", "location map harita konum"],
  ["1f3e0", "House", "Ev", "home"],
  ["1f6cd", "Shopping bags", "Alışveriş poşetleri", "shop store mağaza"],
  ["1f6d2", "Shopping cart", "Alışveriş sepeti", "cart shop sepet"],
  ["1f4b0", "Money bag", "Para kesesi", "money sale para indirim"],
  ["1f4f7", "Camera", "Kamera", "photo fotoğraf"],
  ["1f3b5", "Musical note", "Müzik notası", "music song şarkı"],
  ["2615", "Hot beverage", "Sıcak içecek", "coffee tea kahve çay"],
  ["1f355", "Pizza", "Pizza", "food menu yemek"],
  ["1f354", "Hamburger", "Hamburger", "burger food yemek"],
  ["1f377", "Wine glass", "Şarap kadehi", "wine drink içki"],
  ["1f33b", "Sunflower", "Ayçiçeği", "flower çiçek"],
  ["1f308", "Rainbow", "Gökkuşağı", "pride colour renk"],
  ["1f436", "Dog face", "Köpek", "dog pet evcil"],
  ["1f431", "Cat face", "Kedi", "cat pet evcil"],
  ["26bd", "Soccer ball", "Futbol topu", "football sport spor"],
  ["1f1f9-1f1f7", "Flag: Türkiye", "Türkiye bayrağı", "turkey turkiye tr bayrak"],
];

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }
  return response.text();
}

async function resolveVersion() {
  if (process.env.TWEMOJI_VERSION) {
    return process.env.TWEMOJI_VERSION;
  }
  const body = JSON.parse(
    await fetchText("https://data.jsdelivr.com/v1/packages/gh/jdecked/twemoji/resolved?specifier=latest"),
  );
  if (typeof body.version !== "string") {
    throw new Error("could not resolve the latest Twemoji version");
  }
  return body.version;
}

/**
 * The files are static artwork, but they end up inlined into QR exports, so anything
 * that could script or load a resource is refused outright rather than stripped.
 * A root width/height is added because librsvg (sharp) sizes a nested SVG image by its
 * intrinsic size; a bare 36×36 viewBox would otherwise rasterize soft.
 */
function normalize(svg, file) {
  const compact = svg.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  if (!/^<svg\b[^>]*viewBox="0 0 36 36"[^>]*>/.test(compact)) {
    throw new Error(`${file}: unexpected root element`);
  }
  if (/<script|<foreignObject|\son\w+=|href="(?!#)|url\(\s*['"]?(?!#)/i.test(compact)) {
    throw new Error(`${file}: contains active or external content`);
  }
  return compact.replace(/^<svg\b/, '<svg width="512" height="512"');
}

async function main() {
  const version = await resolveVersion();
  const base = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${version}/assets/svg`;

  const entries = [];
  for (const [code, en, tr, keywords] of EMOJI) {
    const svg = normalize(await fetchText(`${base}/${code}.svg`), `${code}.svg`);
    const char = String.fromCodePoint(...code.split("-").map((part) => Number.parseInt(part, 16)));
    entries.push({ code, char, en, tr, keywords, svg });
  }

  const header = [
    "/* eslint-disable */",
    "/**",
    " * GENERATED by apps/web/scripts/generate-qr-logo-emoji.mjs — do not edit by hand.",
    " *",
    ` * Emoji artwork from Twemoji ${version} (https://github.com/jdecked/twemoji),`,
    " * Copyright 2019 Twitter, Inc and other contributors.",
    " * Graphics licensed under CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/",
    " * Only a width/height was added to each file's root element; the artwork is unchanged.",
    " */",
    "",
  ];

  // Two modules: the catalogue is imported by the browser picker, the artwork only by
  // the server (logo route + export), so the SVG bytes never reach the client bundle.
  const catalogue = [
    ...header,
    "export type QrLogoEmoji = {",
    "  /** Twemoji file name: lowercase code points joined by `-`. */",
    "  code: string;",
    "  char: string;",
    "  en: string;",
    "  tr: string;",
    "  keywords: string;",
    "};",
    "",
    `export const TWEMOJI_VERSION = ${JSON.stringify(version)};`,
    "",
    "export const QR_LOGO_EMOJI: readonly QrLogoEmoji[] = [",
    ...entries.map(({ svg: _svg, ...entry }) => `  ${JSON.stringify(entry)},`),
    "];",
    "",
  ];

  const artwork = [
    ...header,
    'import "server-only";',
    "",
    "/** Twemoji SVG markup keyed by file name (code points joined by `-`). */",
    "export const QR_LOGO_EMOJI_SVG: Readonly<Record<string, string>> = {",
    ...entries.map((entry) => `  ${JSON.stringify(entry.code)}: ${JSON.stringify(entry.svg)},`),
    "};",
    "",
  ];

  await writeFile(CATALOGUE_OUTPUT, catalogue.join("\n"), "utf8");
  await writeFile(ARTWORK_OUTPUT, artwork.join("\n"), "utf8");
  console.log(`wrote ${entries.length} emoji from Twemoji ${version}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
