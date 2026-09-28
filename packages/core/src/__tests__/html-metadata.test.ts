import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, detectCharset, parseHtmlMetadata, resolveHttpUrl } from "../html-metadata";

const page = "https://www.example.com/blog/post?id=1";

describe("parseHtmlMetadata", () => {
  it("prefers Open Graph tags and resolves relative URLs", () => {
    const html = `<!doctype html><html><head>
      <meta charset="utf-8">
      <title>Fallback title</title>
      <meta property="og:title" content="Spring &amp; Summer &#8211; Sale">
      <meta property="og:description" content='Up to 50% off'>
      <meta name="description" content="Plain description">
      <meta property="og:image" content="/img/cover.jpg">
      <meta property="og:site_name" content="Example">
      <link rel="icon" href="favicon-32.png" sizes="32x32">
      <link rel="apple-touch-icon" href="/apple.png">
    </head><body><meta property="og:title" content="ignored"></body></html>`;

    expect(parseHtmlMetadata(html, page)).toEqual({
      title: "Spring & Summer – Sale",
      description: "Up to 50% off",
      image: "https://www.example.com/img/cover.jpg",
      favicon: "https://www.example.com/blog/favicon-32.png",
      siteName: "Example",
    });
  });

  it("falls back to twitter tags, <title> and the meta description", () => {
    const html = `<head><TITLE>
      Hello
      world </TITLE>
      <meta name="twitter:image" content="https://cdn.example.com/t.png">
      <meta name="description" content="Desc">
      <link rel="shortcut icon" href="//static.example.com/f.ico">`;
    expect(parseHtmlMetadata(html, page)).toEqual({
      title: "Hello world",
      description: "Desc",
      image: "https://cdn.example.com/t.png",
      favicon: "https://static.example.com/f.ico",
      siteName: null,
    });
  });

  it("never returns non-http(s) URLs", () => {
    const html = `<head>
      <meta property="og:image" content="javascript:alert(1)">
      <meta name="twitter:image" content="data:image/png;base64,AAAA">
      <link rel="icon" href="data:image/svg+xml,<svg/>">
      <link rel="icon" href="file:///etc/passwd">
    </head>`;
    const result = parseHtmlMetadata(html, page);
    expect(result.image).toBeNull();
    expect(result.favicon).toBeNull();
  });

  it("honours <base href> and ignores mask icons", () => {
    const html = `<head><base href="https://assets.example.org/site/">
      <link rel="mask-icon" href="mask.svg"><link rel="icon" href="icon.svg" type="image/svg+xml"></head>`;
    expect(parseHtmlMetadata(html, page).favicon).toBe("https://assets.example.org/site/icon.svg");
  });

  it("strips control characters and caps long text", () => {
    const html = `<head><title>${"a".repeat(400)}</title><meta name="description" content="x\u0000y"></head>`;
    const result = parseHtmlMetadata(html, page);
    expect(result.title?.length).toBe(255);
    expect(result.description).toBe("x y");
  });

  it("copes with garbage", () => {
    expect(parseHtmlMetadata("", page)).toEqual({
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
    });
    expect(parseHtmlMetadata("<meta content=>< link rel=icon>", page).favicon).toBeNull();
  });
});

describe("helpers", () => {
  it("decodes named and numeric entities, leaving unknown ones", () => {
    expect(decodeHtmlEntities("a &lt;b&gt; &#39;c&#x27; &quot;d&quot; &bogus; &#0; &#xD800;")).toBe(
      "a <b> 'c' \"d\" &bogus; &#0; &#xD800;",
    );
  });

  it("resolves only http(s) without credentials", () => {
    expect(resolveHttpUrl("../x.png", "https://a.test/b/c/")).toBe("https://a.test/b/x.png");
    expect(resolveHttpUrl("https://user:pw@a.test/", page)).toBeNull();
    expect(resolveHttpUrl("ftp://a.test/x", page)).toBeNull();
    expect(resolveHttpUrl("   ", page)).toBeNull();
  });

  it("detects the charset from the header, then the markup", () => {
    expect(detectCharset("text/html; charset=ISO-8859-9", "")).toBe("iso-8859-9");
    expect(detectCharset("text/html", '<meta charset="windows-1254">')).toBe("windows-1254");
    expect(
      detectCharset(null, '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'),
    ).toBe("utf-8");
    expect(detectCharset(null, "<head></head>")).toBe("utf-8");
  });
});
