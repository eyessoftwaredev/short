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

const BASE_STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #ffffff;
    color: #171717;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    width: 100%;
    max-width: 380px;
    border: 1px solid #e3e8ee;
    border-radius: 8px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
  p { margin: 0; font-size: 14px; color: #525252; line-height: 1.5; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 500; }
  input {
    width: 100%;
    padding: 10px 12px;
    font: inherit;
    font-size: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #171717;
  }
  input:focus { outline: 2px solid #0f766e; outline-offset: 2px; border-color: #0f766e; }
  button {
    padding: 10px 16px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid #0f766e;
    border-radius: 8px;
    background: #0f766e;
    color: #ffffff;
    cursor: pointer;
  }
  button:hover { background: #0b5952; border-color: #0b5952; }
  .error { font-size: 13px; color: #b42318; }
  @media (prefers-color-scheme: dark) {
    body { background: #111111; color: #f2f2f2; }
    .card { border-color: #2a2a2a; }
    p { color: #a3a3a3; }
    input { background: #111111; border-color: #3d3d3d; color: #f2f2f2; }
  }
`;

export function passwordGateHtml(options: { title: string; error: boolean }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(options.title)}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <form class="card" method="post">
    <h1>Password required</h1>
    <p>This short link is protected. Enter the password to continue.</p>
    <label>
      Password
      <input type="password" name="password" autocomplete="current-password" autofocus required />
    </label>
    ${options.error ? '<span class="error">Incorrect password. Try again.</span>' : ""}
    <button type="submit">Continue</button>
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
  a.button {
    display: block;
    text-align: center;
    text-decoration: none;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 500;
    border: 1px solid #0f766e;
    border-radius: 8px;
    background: #0f766e;
    color: #ffffff;
  }
  button.secondary { background: transparent; color: inherit; border-color: #cbd5e1; }
  a.link { font-size: 14px; color: #0f766e; text-align: center; }
  input[readonly] { font-size: 13px; }
  .hint { font-size: 13px; }
  @media (prefers-color-scheme: dark) {
    button.secondary { border-color: #3d3d3d; }
    a.link { color: #5eead4; }
  }
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
