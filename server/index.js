import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAndExtractPage, ReaderError } from "./renderPage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4174;
const host = process.env.HOST || "127.0.0.1";

app.use(express.json({ limit: "16kb" }));

app.post("/api/render", async (req, res) => {
  try {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) {
      throw new ReaderError("Enter a website URL.", 400);
    }

    const page = await fetchAndExtractPage(url);
    res.json(page);
  } catch (error) {
    const status = error instanceof ReaderError ? error.status : 500;
    res.status(status).json({
      error: error instanceof Error ? error.message : "The page could not be rendered.",
    });
  }
});

const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, host, () => {
  console.log(`Large Dark Reader running on http://${host}:${port}`);
});
