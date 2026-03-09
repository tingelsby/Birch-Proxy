export default async function handler(req, res) {
  // CORS headers on every response
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const target = req.query.url;
  if (!target) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  try {
    const bodyString = new URLSearchParams(req.body).toString();
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyString,
    });
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(response.status).send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      type: "application/x-www-form-urlencoded",
    },
  },
};
