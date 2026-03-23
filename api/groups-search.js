export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { name } = req.body || {};

    const sid = process.env.AGENCYBLOC_SID;
    const key = process.env.AGENCYBLOC_KEY;

    if (!sid || !key) {
      return res.status(500).json({ error: "Missing credentials" });
    }

    const body = new URLSearchParams();
    body.append("sid", sid);
    body.append("key", key);

    if (name) body.append("name", name);

    const response = await fetch(
      "https://app.agencybloc.com/api/v1/groups/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      }
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
