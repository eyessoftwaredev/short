const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Every interpolated value in the templates below is attacker-controlled link metadata. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
}

/**
 * One calm palette for every page the worker renders itself (password gate, app
 * handoff, link preview), matching the panel: a light grey page with a white card, or
 * a near-black page with a lifted card, and the teal accent. Colors are tokens so the
 * dark scheme only swaps values; everything is inline because the CSP allows no fetches.
 */
const BASE_STYLE = `
  :root {
    color-scheme: light dark;
    --page: #f5f6f8;
    --card: #ffffff;
    --border: #e4e7ec;
    --text: #111418;
    --muted: #5b6472;
    --subtle: #f0f2f5;
    --field: #ffffff;
    --field-border: #cfd5dd;
    --accent: #0f766e;
    --accent-hover: #0b5f58;
    --on-accent: #ffffff;
    --ring: rgba(15, 118, 110, 0.35);
    --danger: #b42318;
    --shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page: #15171c;
      --card: #1c1f26;
      --border: #2a2f39;
      --text: #f2f4f7;
      --muted: #a3abb8;
      --subtle: #242832;
      --field: #15171c;
      --field-border: #353b47;
      --accent: #2dd4bf;
      --accent-hover: #5eead4;
      --on-accent: #062b27;
      --ring: rgba(45, 212, 191, 0.4);
      --danger: #f97066;
      --shadow: none;
    }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    background: var(--page);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 15px;
    line-height: 1.5;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (min-width: 480px) { .card { padding: 32px; } }
  h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
  p { margin: 0; font-size: 14px; color: var(--muted); }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 500; }
  input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    font: inherit;
    font-size: 16px;
    border: 1px solid var(--field-border);
    border-radius: 10px;
    background: var(--field);
    color: var(--text);
  }
  input:focus-visible { outline: 3px solid var(--ring); outline-offset: 1px; border-color: var(--accent); }
  button, a.button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 44px;
    padding: 10px 16px;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: var(--accent);
    color: var(--on-accent);
    cursor: pointer;
  }
  button:hover, a.button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
  button:focus-visible, a:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px; }
  button.secondary { background: transparent; color: var(--text); border-color: var(--field-border); }
  button.secondary:hover { background: var(--subtle); }
  a.link { font-size: 14px; font-weight: 500; color: var(--accent); text-align: center; }
  .error { font-size: 13px; color: var(--danger); }
  .eyebrow {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
`;

const GATE_COPY = {
  en: {
    heading: "Password required",
    body: "This short link is protected. Enter the password to continue.",
    label: "Password",
    error: "Incorrect password. Try again.",
    submit: "Continue",
  },
  tr: {
    heading: "Parola gerekli",
    body: "Bu kısa bağlantı korumalı. Devam etmek için parolayı girin.",
    label: "Parola",
    error: "Parola yanlış. Tekrar deneyin.",
    submit: "Devam et",
  },
} as const;

export function passwordGateHtml(options: { title: string; error: boolean; language?: string }): string {
  const tr = options.language === "tr";
  const copy = tr ? GATE_COPY.tr : GATE_COPY.en;
  return `<!doctype html>
<html lang="${tr ? "tr" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(options.title)}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <form class="card" method="post">
    <h1>${copy.heading}</h1>
    <p>${copy.body}</p>
    <label>
      ${copy.label}
      <input type="password" name="password" autocomplete="current-password" autofocus required />
    </label>
    ${options.error ? `<span class="error">${copy.error}</span>` : ""}
    <button type="submit">${copy.submit}</button>
  </form>
</body>
</html>`;
}

/** Turkish locative for the app names open-mode knows ("Instagram'da", "X'te"). */
const TR_LOCATIVE: Record<string, string> = {
  YouTube: "YouTube'da",
  Instagram: "Instagram'da",
  TikTok: "TikTok'ta",
  X: "X'te",
  Facebook: "Facebook'ta",
  Spotify: "Spotify'da",
  LinkedIn: "LinkedIn'de",
  WhatsApp: "WhatsApp'ta",
  Telegram: "Telegram'da",
  Pinterest: "Pinterest'te",
};

function trIn(app: string): string {
  return TR_LOCATIVE[app] ?? `${app} uygulamasında`;
}

const HANDOFF_COPY = {
  en: {
    openingTitle: (app: string) => `Opening ${app}…`,
    openingBody: "If the app does not open, you will continue in your browser in a moment.",
    tapTitle: (app: string) => `Open in ${app}`,
    tapBody: (app: string) => `This link opens in the ${app} app. Tap the button to continue.`,
    appButton: (app: string) => `Open in ${app}`,
    continueBrowser: "Continue in browser",
    browserTitle: "Open in your browser",
    browserBody:
      "This link works best in your phone's browser. Tap the button below, or copy the link and paste it into your browser.",
    browserIosHint: "If the button does nothing, open the ••• menu and choose “Open in browser”.",
    browserButton: "Open in browser",
    copy: "Copy link",
    copied: "Copied",
    linkLabel: "Link",
    continueWeb: "Continue",
    continueHere: "Continue here",
  },
  tr: {
    openingTitle: (app: string) => `${app} açılıyor…`,
    openingBody: "Uygulama açılmazsa birkaç saniye içinde tarayıcıda devam edeceksiniz.",
    tapTitle: (app: string) => `${trIn(app)} aç`,
    tapBody: (app: string) => `Bu bağlantı ${app} uygulamasında açılır. Devam etmek için düğmeye dokunun.`,
    appButton: (app: string) => `${trIn(app)} aç`,
    continueBrowser: "Tarayıcıda devam et",
    browserTitle: "Tarayıcınızda açın",
    browserBody:
      "Bu bağlantı telefonunuzun tarayıcısında daha iyi çalışır. Aşağıdaki düğmeye dokunun ya da bağlantıyı kopyalayıp tarayıcınıza yapıştırın.",
    browserIosHint: "Düğme işe yaramazsa ••• menüsünü açıp “Tarayıcıda aç” seçeneğine dokunun.",
    browserButton: "Tarayıcıda aç",
    copy: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
    linkLabel: "Bağlantı",
    continueWeb: "Devam et",
    continueHere: "Burada devam et",
  },
} as const;

/**
 * Static on purpose: every per-request value is read from escaped attributes in the
 * markup, so the script itself never interpolates anything and runs under a nonce.
 * - `data-auto`: attempted once on load (custom scheme / intent / browser escape).
 * - `data-fallback="1"`: continue to the web page after 2.5 s unless something took
 *   over (the page hid, or an "Open in …?" dialog took focus).
 * - `data-web-script="1"`: "continue in browser" navigates from script, because a tap
 *   on the same https link would re-trigger the app's universal link on iOS.
 */
const HANDOFF_SCRIPT = `(function () {
  var d = document;
  var b = d.body;
  var web = d.getElementById("web");
  var left = false;
  var away = function () { left = true; };
  d.addEventListener("visibilitychange", function () { if (d.hidden) { away(); } });
  window.addEventListener("pagehide", away);
  window.addEventListener("blur", away);
  var auto = b.getAttribute("data-auto");
  if (auto) { try { window.location.href = auto; } catch (e) {} }
  if (web && b.getAttribute("data-fallback") === "1") {
    setTimeout(function () { if (!left && !d.hidden) { window.location.replace(web.getAttribute("href")); } }, 2500);
  }
  if (web && b.getAttribute("data-web-script") === "1") {
    web.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.replace(web.getAttribute("href"));
    });
  }
  var copy = d.getElementById("copy");
  var field = d.getElementById("url");
  if (copy && field) {
    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = copy.getAttribute("data-done"); };
      var legacy = function () {
        field.focus();
        field.select();
        try { if (d.execCommand("copy")) { done(); } } catch (e) {}
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(field.value).then(done, legacy);
      } else {
        legacy();
      }
    });
  }
})();`;

const HANDOFF_STYLE = `${BASE_STYLE}
  .actions { display: flex; flex-direction: column; gap: 10px; }
  a.link { padding: 6px 0; }
  input[readonly] { font-size: 13px; background: var(--subtle); }
  .hint { font-size: 13px; }
`;

type HandoffBase = {
  /** Pre-validated with `isSafeDestination`. */
  webUrl: string;
  language: string;
  nonce: string;
};

export type HandoffOptions =
  | (HandoffBase & {
      /** Open the destination in its native app (see `planOpen` in core). */
      mode: "app";
      appName: string;
      /** The button's target: the https universal link, a custom scheme or an intent. */
      buttonUrl: string;
      /** Attempted once on load; null when only a tap can reach the app. */
      autoUrl: string | null;
      webFallback: boolean;
    })
  | (HandoffBase & {
      /** Leave a social app's in-app browser. */
      mode: "browser";
      /** Pre-validated with `isSafeLaunchUrl`. */
      launchUrl: string;
      os: string;
    });

/** App-launch / browser-escape interstitial for a link's `openMode`. */
export function handoffHtml(options: HandoffOptions): string {
  const copy = options.language === "tr" ? HANDOFF_COPY.tr : HANDOFF_COPY.en;
  const web = escapeHtml(options.webUrl);

  let title: string;
  let body: string;
  let attributes: string;
  if (options.mode === "app") {
    const name = escapeHtml(options.appName);
    const opening = options.autoUrl !== null;
    title = opening ? copy.openingTitle(name) : copy.tapTitle(name);
    // A tap on the https button is the app's universal link; "continue" must not be.
    const scriptedWeb = options.buttonUrl === options.webUrl;
    attributes = [
      options.autoUrl ? `data-auto="${escapeHtml(options.autoUrl)}"` : "",
      `data-fallback="${options.webFallback ? "1" : "0"}"`,
      `data-web-script="${scriptedWeb ? "1" : "0"}"`,
    ]
      .filter(Boolean)
      .join(" ");
    body = `<h1>${title}</h1>
    <p>${opening ? copy.openingBody : copy.tapBody(name)}</p>
    <div class="actions">
      <a class="button" id="launch" href="${escapeHtml(options.buttonUrl)}">${copy.appButton(name)}</a>
      <a class="link" id="web" href="${web}" rel="noreferrer">${copy.continueBrowser}</a>
    </div>`;
  } else {
    title = copy.browserTitle;
    attributes = `data-auto="${escapeHtml(options.launchUrl)}" data-fallback="0" data-web-script="0"`;
    body = `<h1>${title}</h1>
    <p>${copy.browserBody}</p>
    ${options.os === "ios" ? `<p class="hint">${copy.browserIosHint}</p>` : ""}
    <div class="actions">
      <a class="button" id="launch" href="${escapeHtml(options.launchUrl)}">${copy.browserButton}</a>
      <label>
        ${copy.linkLabel}
        <input id="url" type="text" readonly value="${web}" />
      </label>
      <button type="button" class="secondary" id="copy" data-done="${copy.copied}">${copy.copy}</button>
      <a class="link" id="web" href="${web}" rel="noreferrer">${copy.continueHere}</a>
    </div>`;
  }

  return `<!doctype html>
<html lang="${options.language === "tr" ? "tr" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="referrer" content="no-referrer" />
<title>${title}</title>
<style>${HANDOFF_STYLE}</style>
</head>
<body ${attributes}>
  <main class="card">
    ${body}
  </main>
  <script nonce="${escapeHtml(options.nonce)}">${HANDOFF_SCRIPT}</script>
</body>
</html>`;
}

const PREVIEW_COPY = {
  en: {
    eyebrow: "Link preview",
    goesTo: "This short link goes to",
    fullUrl: "Full address",
    varies: "Some visitors may be sent elsewhere depending on their location, device or language.",
    continue: "Continue to site",
    protectedTitle: "Protected link",
    protectedBody:
      "This link is password-protected, so its destination is not shown here. Continue to enter the password.",
    protectedButton: "Continue",
    unavailableTitle: "Link unavailable",
    unavailableBody: "This link does not exist, has expired or is not active right now.",
    note: (short: string) =>
      `You are seeing this preview because the address ends with “+”. Nothing was recorded. The short link is ${short}.`,
  },
  tr: {
    eyebrow: "Bağlantı önizlemesi",
    goesTo: "Bu kısa bağlantı şuraya gider",
    fullUrl: "Tam adres",
    varies: "Bazı ziyaretçiler konumlarına, cihazlarına veya dillerine göre başka bir sayfaya yönlendirilebilir.",
    continue: "Siteye devam et",
    protectedTitle: "Korumalı bağlantı",
    protectedBody:
      "Bu bağlantı parola korumalı olduğu için hedefi burada gösterilmez. Parolayı girmek için devam edin.",
    protectedButton: "Devam et",
    unavailableTitle: "Bağlantı kullanılamıyor",
    unavailableBody: "Bu bağlantı yok, süresi dolmuş ya da şu anda etkin değil.",
    note: (short: string) =>
      `Adres “+” ile bittiği için bu önizlemeyi görüyorsunuz. Hiçbir ziyaret kaydedilmedi. Kısa bağlantı: ${short}.`,
  },
} as const;

const PREVIEW_STYLE = `${BASE_STYLE}
  .target { display: flex; flex-direction: column; gap: 4px; }
  .host {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .title { color: var(--text); font-size: 15px; font-weight: 500; }
  .url {
    display: block;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--subtle);
    color: var(--text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.45;
    word-break: break-all;
  }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 12px; font-weight: 500; color: var(--muted); }
  .hint { font-size: 13px; }
  .note { font-size: 12px; border-top: 1px solid var(--border); padding-top: 14px; }
`;

export type PreviewOptions = {
  language: string;
  /** `<hostname>/<slug>` of the short link, for display. */
  shortLabel: string;
  /** The tracked short link the button leads to. */
  shortUrl: string;
} & (
  | {
      state: "available";
      /** Pre-validated with `isSafeDestination`. */
      destination: string;
      title: string | null;
      /** Targeting / A-B / app links may send some visitors elsewhere. */
      varies: boolean;
    }
  | { state: "protected" }
  | { state: "unavailable" }
);

/**
 * The `<slug>+` page: where a short link leads, without following it. Static markup
 * only (no script, no remote images) and every value is escaped, because the title and
 * the URL are whatever the link owner typed.
 */
export function previewHtml(options: PreviewOptions): string {
  const tr = options.language === "tr";
  const copy = tr ? PREVIEW_COPY.tr : PREVIEW_COPY.en;
  const shortUrl = escapeHtml(options.shortUrl);
  const note = `<p class="note">${escapeHtml(copy.note(options.shortLabel))}</p>`;

  let title: string;
  let body: string;
  if (options.state === "available") {
    let host = options.destination;
    try {
      // `hostname` is the ASCII (punycode) form, which defeats look-alike IDN spoofing.
      host = new URL(options.destination).hostname;
    } catch {
      // Already validated upstream; fall back to the raw value, escaped below.
    }
    title = `${copy.eyebrow}: ${host}`;
    body = `<span class="eyebrow">${copy.eyebrow}</span>
    <div class="target">
      <p>${copy.goesTo}</p>
      <h1 class="host">${escapeHtml(host)}</h1>
    </div>
    ${options.title ? `<p class="title">${escapeHtml(options.title)}</p>` : ""}
    <div class="field">
      <span class="field-label">${copy.fullUrl}</span>
      <code class="url">${escapeHtml(options.destination)}</code>
    </div>
    ${options.varies ? `<p class="hint">${copy.varies}</p>` : ""}
    <a class="button" href="${shortUrl}" rel="nofollow noreferrer">${copy.continue}</a>
    ${note}`;
  } else if (options.state === "protected") {
    title = copy.protectedTitle;
    body = `<span class="eyebrow">${copy.eyebrow}</span>
    <h1>${copy.protectedTitle}</h1>
    <p>${copy.protectedBody}</p>
    <a class="button" href="${shortUrl}" rel="nofollow noreferrer">${copy.protectedButton}</a>
    ${note}`;
  } else {
    title = copy.unavailableTitle;
    body = `<span class="eyebrow">${copy.eyebrow}</span>
    <h1>${copy.unavailableTitle}</h1>
    <p>${copy.unavailableBody}</p>`;
  }

  return `<!doctype html>
<html lang="${tr ? "tr" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="referrer" content="no-referrer" />
<title>${escapeHtml(title)}</title>
<style>${PREVIEW_STYLE}</style>
</head>
<body>
  <main class="card">
    ${body}
  </main>
</body>
</html>`;
}

export function cloakHtml(options: {
  destination: string;
  title: string | null;
  description: string | null;
  image: string | null;
  noIndex: boolean;
}): string {
  const title = escapeHtml(options.title ?? "");
  const description = escapeHtml(options.description ?? "");
  const image = options.image ? escapeHtml(options.image) : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${options.noIndex ? '<meta name="robots" content="noindex, nofollow" />' : ""}
<title>${title}</title>
${description ? `<meta name="description" content="${description}" />` : ""}
<meta property="og:title" content="${title}" />
${description ? `<meta property="og:description" content="${description}" />` : ""}
${image ? `<meta property="og:image" content="${image}" />` : ""}
<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>
</head>
<body>
<iframe src="${escapeHtml(options.destination)}" allow="fullscreen" referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
}
