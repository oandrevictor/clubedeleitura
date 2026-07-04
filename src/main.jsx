import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const FONT_STEPS = [18, 20, 22, 24, 28, 32];

function getInitialUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || "";
}

function getReaderPath(url) {
  return `/render?url=${encodeURIComponent(url)}`;
}

function App() {
  const [url, setUrl] = useState(getInitialUrl);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fontIndex, setFontIndex] = useState(2);

  const fontSize = FONT_STEPS[fontIndex];
  const canShrink = fontIndex > 0;
  const canGrow = fontIndex < FONT_STEPS.length - 1;
  const pageHost = useMemo(() => {
    if (!page?.url) return "";
    try {
      return new URL(page.url).hostname.replace(/^www\./, "");
    } catch {
      return page.siteName || "";
    }
  }, [page]);

  async function renderPage(event) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter a website URL.");
      setPage(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The page could not be rendered.");
      }

      setPage(payload);
      window.history.replaceState(null, "", getReaderPath(trimmedUrl));
    } catch (requestError) {
      setPage(null);
      setError(requestError.message || "The page could not be rendered.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="reader-panel" aria-labelledby="app-title">
        <form className="url-bar" onSubmit={renderPage}>
          <div className="title-block">
            <h1 id="app-title">Large Dark Reader</h1>
            <p>Readable pages, enlarged and restyled.</p>
          </div>
          <div className="url-row">
            <label className="sr-only" htmlFor="website-url">
              Website URL
            </label>
            <input
              id="website-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/article"
              autoComplete="url"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Rendering" : "Render"}
            </button>
          </div>
          {error ? <p className="status error">{error}</p> : null}
        </form>

        {page ? (
          <article className="reader" style={{ "--reader-font-size": `${fontSize}px` }}>
            <header className="reader-header">
              <div>
                <p className="source">{page.siteName || pageHost}</p>
                <h2>{page.title}</h2>
                {page.byline ? <p className="byline">{page.byline}</p> : null}
              </div>
              <div className="reader-actions" aria-label="Reader controls">
                <a href={page.url} target="_blank" rel="noreferrer noopener">
                  Source
                </a>
                <button type="button" onClick={() => setFontIndex(fontIndex - 1)} disabled={!canShrink}>
                  A-
                </button>
                <output aria-label="Current font size">{fontSize}px</output>
                <button type="button" onClick={() => setFontIndex(fontIndex + 1)} disabled={!canGrow}>
                  A+
                </button>
              </div>
            </header>
            {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
            <div className="reader-content" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
          </article>
        ) : (
          <section className="empty-state" aria-label="No rendered page">
            <h2>Paste a link to begin</h2>
            <p>Best results come from articles, documentation, essays, and other text-heavy pages.</p>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
