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
