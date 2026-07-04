import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const FONT_STEPS = [18, 20, 22, 24, 28, 32];
const THEMES = [
  { id: "candle", label: "Vela", swatch: "#f6d99f", description: "contraste escuro quente" },
  { id: "mist", label: "Bruma", swatch: "#a9b0b5", description: "contraste escuro suave" },
  { id: "dusk", label: "Crepúsculo", swatch: "#c9a56d", description: "contraste escuro médio" },
  { id: "graphite", label: "Grafite", swatch: "#8f969f", description: "contraste escuro nítido" },
  { id: "plum", label: "Ameixa", swatch: "#c1a3d9", description: "contraste escuro colorido" },
  { id: "midnight", label: "Noite", swatch: "#9ec5ff", description: "contraste escuro forte" },
  { id: "forest", label: "Bosque", swatch: "#9eb384", description: "contraste verde escuro" },
  { id: "parchment", label: "Papel", swatch: "#d0a66f", description: "contraste claro" },
  { id: "cream", label: "Creme", swatch: "#ead7ad", description: "papel claro suave" },
  { id: "linen", label: "Linho", swatch: "#d7d2bf", description: "papel neutro frio" },
  { id: "blush-paper", label: "Rosa", swatch: "#e6c1bb", description: "papel rosado suave" },
];

function getInitialUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || "";
}

function getReaderPath(url) {
  return `/render?url=${encodeURIComponent(url)}`;
}

function getInitialTheme() {
  const storedTheme = window.localStorage.getItem("reader-theme");
  return THEMES.some((theme) => theme.id === storedTheme) ? storedTheme : "candle";
}

function App() {
  const [url, setUrl] = useState(getInitialUrl);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fontIndex, setFontIndex] = useState(2);
  const [theme, setTheme] = useState(getInitialTheme);

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

  useEffect(() => {
    window.localStorage.setItem("reader-theme", theme);
  }, [theme]);

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
    <main className="app-shell" data-theme={theme}>
      <section className="reader-panel" aria-labelledby="app-title">
        <form className="url-bar" onSubmit={renderPage}>
          <div className="title-block">
            <h1 id="app-title">Clube de Leitura</h1>
            <p>App desenvolvido especialmente para o Clube de Leitura da Branca.</p>
          </div>
          <div className="theme-picker" aria-label="Opções de cor">
            {THEMES.map((themeOption) => (
              <button
                key={themeOption.id}
                type="button"
                className={theme === themeOption.id ? "theme-option active" : "theme-option"}
                style={{ "--theme-swatch": themeOption.swatch }}
                aria-pressed={theme === themeOption.id}
                aria-label={`${themeOption.label}: ${themeOption.description}`}
                title={`${themeOption.label}: ${themeOption.description}`}
                onClick={() => setTheme(themeOption.id)}
              >
                <span aria-hidden="true" />
                {themeOption.label}
              </button>
            ))}
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
