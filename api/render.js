import { fetchAndExtractPage, ReaderError } from "../server/renderPage.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) {
      throw new ReaderError("Enter a website URL.", 400);
    }

    const page = await fetchAndExtractPage(url);
    return res.status(200).json(page);
  } catch (error) {
    const status = error instanceof ReaderError ? error.status : 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : "The page could not be rendered.",
    });
  }
}
