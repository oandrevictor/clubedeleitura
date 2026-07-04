import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import sanitizeHtml from "sanitize-html";

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export class ReaderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ReaderError";
    this.status = status;
  }
}

export function normalizeUrl(input) {
  let parsed;

  try {
    parsed = new URL(input);
  } catch {
    throw new ReaderError("Enter a valid website URL.", 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ReaderError("Only http and https links are supported.", 400);
  }

  parsed.hash = "";
  return parsed.toString();
}

function removeUnsafeNodes(document) {
  document
    .querySelectorAll("script, style, noscript, iframe, object, embed, form, input, button")
    .forEach((node) => node.remove());
}

function absolutizeContent(contentHtml, pageUrl) {
  const dom = new JSDOM(`<main>${contentHtml}</main>`);
  const { document } = dom.window;

  document.querySelectorAll("[href]").forEach((node) => {
    const href = node.getAttribute("href");
    if (!href) return;

    try {
      node.setAttribute("href", new URL(href, pageUrl).toString());
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noreferrer noopener");
    } catch {
      node.removeAttribute("href");
    }
  });

  document.querySelectorAll("[src]").forEach((node) => {
    const src = node.getAttribute("src");
    if (!src) return;

    try {
      const resolved = new URL(src, pageUrl);
      if (["http:", "https:"].includes(resolved.protocol)) {
        node.setAttribute("src", resolved.toString());
      } else {
        node.removeAttribute("src");
      }
    } catch {
      node.removeAttribute("src");
    }
  });

  return document.querySelector("main").innerHTML;
}

function sanitizeContent(contentHtml) {
  return sanitizeHtml(contentHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "article",
      "aside",
      "figure",
      "figcaption",
      "img",
      "main",
      "section",
      "time",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      time: ["datetime"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
}

export function extractReadablePage(html, pageUrl) {
  const dom = new JSDOM(html, {
    url: pageUrl,
    contentType: "text/html",
  });

  removeUnsafeNodes(dom.window.document);

  const reader = new Readability(dom.window.document, {
    charThreshold: 120,
  });
  const article = reader.parse();

  if (!article?.content || article.textContent.trim().length < 120) {
    throw new ReaderError("Readable content could not be extracted from this page.", 422);
  }

  const contentHtml = sanitizeContent(absolutizeContent(article.content, pageUrl));

  return {
    title: article.title || new URL(pageUrl).hostname,
    siteName: article.siteName || new URL(pageUrl).hostname,
    byline: article.byline || "",
    url: pageUrl,
    contentHtml,
    excerpt: article.excerpt || "",
  };
}

async function readLimitedResponse(response) {
  const reader = response.body?.getReader();

  if (!reader) {
    const text = await response.text();
    if (text.length > MAX_HTML_BYTES) {
      throw new ReaderError("This page is too large to render.", 413);
    }
    return text;
  }

  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      throw new ReaderError("This page is too large to render.", 413);
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchAndExtractPage(inputUrl) {
  const pageUrl = normalizeUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "LargeDarkReader/1.0",
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ReaderError("The page took too long to respond.", 504);
    }
    throw new ReaderError("The page could not be fetched.", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ReaderError(`The page returned HTTP ${response.status}.`, 502);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new ReaderError("Only HTML pages can be rendered.", 415);
  }

  const html = await readLimitedResponse(response);
  return extractReadablePage(html, response.url || pageUrl);
}
