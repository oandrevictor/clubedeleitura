# Large Dark Reader

A local reader-view app that fetches a website URL server-side, extracts readable content, sanitizes it, and renders it with large typography on a dark interface.

## Run

```bash
npm install
npm run build
npm run start
```

Open `http://127.0.0.1:4174`.

For frontend development:

```bash
npm run dev
```

The backend API runs on `http://127.0.0.1:4174`, and Vite proxies `/api` requests from `http://127.0.0.1:5173`.

## API

`POST /api/render`

```json
{
  "url": "https://example.com/article"
}
```

Returns the extracted page title, site name, byline, source URL, excerpt, and sanitized HTML content.

## Notes

This app intentionally renders a reader view rather than embedding the original website. It works best for articles, documentation, essays, and text-heavy pages.
