export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // Parse body — handle both string and object forms
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    console.log("claude.js body:", JSON.stringify(body)?.substring(0, 200));
    console.log("API key present:", !!process.env.ANTHROPIC_API_KEY);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Anthropic status:", response.status);
    return res.status(response.status).json(data);
  } catch (e) {
    console.log("claude.js error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } }
};
