export default async function handler(req, res) {
  // CORS headers on every response
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Log every incoming request
  console.log("=== INCOMING REQUEST ===");
  console.log("method:", req.method);
  console.log("headers:", JSON.stringify(req.headers, null, 2));
  console.log("query:", JSON.stringify(req.query, null, 2));
  console.log("body:", JSON.stringify(req.body, null, 2));
  console.log("body type:", typeof req.body);

  // Handle preflight
  if (req.method === "OPTIONS") {
    console.log("Handled OPTIONS preflight");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const target = req.query.url ? decodeURIComponent(req.query.url) : null;
  if (!target) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  console.log("target URL:", target);

  try {
    // Safely serialize body — handles both object and string forms
    let bodyString;
    if (typeof req.body === "string") {
      bodyString = req.body;
    } else if (typeof req.body === "object" && req.body !== null) {
      bodyString = new URLSearchParams(req.body).toString();
    } else {
      bodyString = "";
    }

    console.log("serialized body:", bodyString);

    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyString,
    });

    console.log("downstream status:", response.status);
    console.log("downstream headers:", JSON.stringify(Object.fromEntries(response.headers), null, 2));

    const text = await response.text();
    console.log("downstream body:", text.substring(0, 500)); // cap at 500 chars

    res.setHeader("Content-Type", "application/json");
    return res.status(response.status).send(text);

  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}

export const config = {
  api: {
    bodyParser: {
      encoding: "utf-8",
    },
  },
};
