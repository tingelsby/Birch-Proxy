export default async function handler(req, res) {
  // Debug: test whether Vercel can see env vars
  if (req.query?.action === "debug-env") {
    return res.status(200).json({
      hasSid: !!process.env.AGENCYBLOC_SID,
      hasKey: !!process.env.AGENCYBLOC_KEY,
    });
  }

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Only POST or GET allowed" });
  }

  const sid = process.env.AGENCYBLOC_SID;
  const key = process.env.AGENCYBLOC_KEY;

  if (!sid || !key) {
    return res.status(500).json({ error: "Missing AgencyBloc credentials" });
  }

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

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        error: "Invalid JSON returned from AgencyBloc",
        raw: text,
      };
    }

    if (!response.ok) {
      return {
        error: "AgencyBloc request failed",
        status: response.status,
        data,
      };
    }

    return data;
  }

  function simplifyGroup(g) {
    return {
      groupId: g.groupID || g.groupId || "",
      groupName: g.groupName || "",
      type: g.type || "",
      status: g.status || "",
      businessPhone: g.businessPhone || "",
      fedTaxID: g.fedTaxID || "",
      detailUrl: g.detail_url || g.detailUrl || "",
    };
  }

  const action = req.query?.action || "groups-search";

  try {
    // Search groups
    if (action === "groups-search") {
      const body = req.body || {};
      const groups = await ab("groups/search", body);
      return res.status(200).json(groups);
    }

    // Get all groups - simplified output for Copilot
    if (action === "all-groups") {
      const groups = await ab("groups/search", { limit: 0 });

      if (!Array.isArray(groups)) {
        return res.status(500).json({
          error: "Unexpected response from AgencyBloc groups/search",
          data: groups,
        });
      }

      const simplified = groups.map(simplifyGroup);

      return res.status(200).json({
        count: simplified.length,
        groups: simplified,
      });
    }

    // Group detail
    if (action === "groups-detail") {
      const body = req.body || {};
      const groupID = body.groupID;

      if (!groupID) {
        return res.status(400).json({ error: "Missing groupID" });
      }

      const detail = await ab("groups/detail", { groupID });
      return res.status(200).json(detail);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("AgencyBloc Error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err?.message || "Unknown error",
    });
  }
}
