export default async function handler(req, res) {
  // ✅ DEBUG (lets you test in browser)
  if (req.query?.action === "debug-env") {
    return res.status(200).json({
      hasSid: !!process.env.AGENCYBLOC_SID,
      hasKey: !!process.env.AGENCYBLOC_KEY,
    });
  }

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Allow GET for testing, POST for real use
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Only POST or GET allowed" });
  }

  // ✅ Check credentials
  const sid = process.env.AGENCYBLOC_SID;
  const key = process.env.AGENCYBLOC_KEY;

  if (!sid || !key) {
    return res.status(500).json({ error: "Missing AgencyBloc credentials" });
  }

  // ✅ Helper function to call AgencyBloc
  async function ab(endpoint, body = {}) {
    const response = await fetch(`https://app.agencybloc.com/api/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        ...body,
        SID: sid,
        KEY: key,
      }),
    });

    const data = await response.json();
    return data;
  }

  // ✅ Get action
  const action = req.query?.action || "groups-search";

  try {
    // 🔹 SIMPLE GROUP SEARCH
    if (action === "groups-search") {
      const body = req.body || {};
      const groups = await ab("groups/search", body);
      return res.status(200).json(groups);
    }

    // 🔹 GET ALL GROUPS (basic version)
    if (action === "all-groups") {
      const groups = await ab("groups/search", { limit: 0 });
      return res.status(200).json(groups);
    }

    // 🔹 GROUP DETAIL
    if (action === "groups-detail") {
      const { groupID } = req.body || {};
      if (!groupID) {
        return res.status(400).json({ error: "Missing groupID" });
      }

      const detail = await ab("groups/detail", { groupID });
      return res.status(200).json(detail);
    }

    // 🔹 DEFAULT
    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("AgencyBloc Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
