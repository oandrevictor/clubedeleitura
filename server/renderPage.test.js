import { describe, expect, it } from "vitest";
import { extractReadablePage, normalizeUrl, ReaderError } from "./renderPage.js";

const articleHtml = `
  <!doctype html>
  <html>
    <head>
      <title>Example Article</title>
      <meta property="og:site_name" content="Example Docs">
      <meta name="description" content="A readable test article.">
    </head>
    <body>
      <article>
        <h1>Example Article</h1>
        <p>This article contains enough readable text to satisfy the extraction threshold and verify that the app can render normal paragraphs from a source page.</p>
        <p>It also includes a <a href="/docs">relative documentation link</a>, an image, and scripts that should never survive the reader extraction or sanitizer.</p>
        <p>Additional readable content makes this closer to a normal documentation or blog page with multiple paragraphs and meaningful body copy for the parser.</p>
        <img src="/image.png" alt="Example">
        <script>window.evil = true;</script>
      </article>
    </body>
  </html>
`;

describe("normalizeUrl", () => {
  it("accepts http and https URLs", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
    expect(normalizeUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects invalid and unsupported URLs", () => {
    expect(() => normalizeUrl("not-a-url")).toThrow(ReaderError);
    expect(() => normalizeUrl("file:///tmp/page.html")).toThrow("Only http and https links are supported.");
  });
});

describe("extractReadablePage", () => {
  it("extracts and sanitizes article content", () => {
    const result = extractReadablePage(articleHtml, "https://example.com/articles/story");

    expect(result.title).toContain("Example Article");
    expect(result.siteName).toBe("Example Docs");
    expect(result.contentHtml).toContain("https://example.com/docs");
    expect(result.contentHtml).toContain("https://example.com/image.png");
    expect(result.contentHtml).not.toContain("<script");
  });

  it("throws when content is too sparse", () => {
    expect(() => extractReadablePage("<html><body><p>Short.</p></body></html>", "https://example.com")).toThrow(
      "Readable content could not be extracted",
    );
  });
});
