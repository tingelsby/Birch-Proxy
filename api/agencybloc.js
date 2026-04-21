// api/agencybloc.js
// Full AgencyBloc handler — all actions
// Supports both req.query.action and req.body.action
// Normalizes entityTypeID string → number for AgencyBloc

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Debug: confirm env vars are present (GET /api/agencybloc?action=debug-env)
  if (req.method === "GET" && req.query?.action === "debug-env") {
    return res.status(200).json({
      hasSid: !!process.env.AGENCYBLOC_SID,
      hasKey: !!process.env.AGENCYBLOC_KEY,
    });
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    console.log("=== AGENCYBLOC REQUEST ===");
    console.log("query:", JSON.stringify(req.query || {}));
    console.log("body:", JSON.stringify(req.body || {}));

    const sid = process.env.AGENCYBLOC_SID;
    const key = process.env.AGENCYBLOC_KEY;
    if (!sid || !key) return res.status(500).json({ error: "Missing AgencyBloc credentials" });

    // Support action from query string OR body
    const urlPath = req.url || "";
    const pathAction = urlPath.split("/api/agencybloc/")[1]?.split("?")[0];
    const action = pathAction || req.query.action || req.body?.action;
    const input = req.body || {};

    console.log("resolved action:", action);
    console.log("resolved input:", JSON.stringify(input));

    // Normalize entityTypeID from string to number for AgencyBloc
    function normalizeEntityType(type) {
      if (type === "Group") return 1;
      if (type === "Individual") return 2;
      if (type === "Agent") return 3;
      if (type === "Carrier") return 4;
      if (type === "Lead") return 5;
      return type;
    }

    // Core AgencyBloc fetch helper
    const ab = async (endpoint, params = {}) => {
      // Normalize entityTypeID if present
      if (params.entityTypeID) {
        params.entityTypeID = normalizeEntityType(params.entityTypeID);
      }
      const body = new URLSearchParams({ sid, key, ...params });
      console.log("AB TARGET:", `https://app.agencybloc.com/api/v1/${endpoint}`);
      console.log("AB BODY:", body.toString());
      const r = await fetch(`https://app.agencybloc.com/api/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const text = await r.text();
      console.log("AB STATUS:", r.status);
      console.log("AB RESPONSE:", text.substring(0, 500));
      try { return JSON.parse(text); }
      catch { return { error: "Invalid JSON from AgencyBloc", raw: text }; }
    };

    // Simplified group shape for list views
    const simplifyGroup = (g) => ({
      groupId: g.groupID || "",
      groupName: g.groupName || "",
      type: g.type || "",
      status: g.status || "",
      businessPhone: g.businessPhone || "",
      fedTaxID: g.fedTaxID || "",
      detailUrl: g.detail_url || ""
    });

    switch (action) {

      // ── GROUPS ──────────────────────────────────────────────
      case "groups-search": {
        const params = { limit: 0 };
        if (input.groupName) params.groupName = input.groupName;
        if (input.type) params.type = input.type;
        if (input.fedTaxID) params.fedTaxID = input.fedTaxID;
        if (input.businessPhone) params.businessPhone = input.businessPhone;
        return res.json(await ab("groups/search", params));
      }

      case "groups-detail": {
        if (!input.groupID) return res.status(400).json({ error: "groupID required" });
        return res.json(await ab("groups/detail", {
          groupID: input.groupID,
          includeActivities: 1
        }));
      }

      // ── INDIVIDUALS ─────────────────────────────────────────
      case "individuals-search": {
        const params = { limit: 0 };
        if (input.firstName) params.firstName = input.firstName;
        if (input.lastName) params.lastName = input.lastName;
        if (input.email) params.email = input.email;
        if (input.groupID) params.groupID = input.groupID;
        if (input.anyPhone) params.anyPhone = input.anyPhone;
        return res.json(await ab("individuals/search", params));
      }

      case "individuals-detail": {
        if (!input.individualID) return res.status(400).json({ error: "individualID required" });
        return res.json(await ab("individuals/detail", {
          individualID: input.individualID,
          includeActivities: 1
        }));
      }

      // ── POLICIES ────────────────────────────────────────────
      case "policies-search": {
        const params = { limit: 0 };
        if (input.policyNumber) params.policyNumber = input.policyNumber;
        if (input.policyCoverageType) params.policyCoverageType = input.policyCoverageType;
        if (input.carrier) params.carrier = input.carrier;
        if (input.entityID) params.entityID = input.entityID;
        if (input.entityTypeID) params.entityTypeID = input.entityTypeID;
        return res.json(await ab("policies/search", params));
      }

      case "policies-detail": {
        if (!input.policyID) return res.status(400).json({ error: "policyID required" });
        return res.json(await ab("policies/detail", { policyID: input.policyID }));
      }

      // ── AGENTS / PRODUCERS ───────────────────────────────────
      case "agents-search": {
        const params = { limit: 0 };
        if (input.firstName) params.firstName = input.firstName;
        if (input.lastName) params.lastName = input.lastName;
        if (input.email) params.email = input.email;
        return res.json(await ab("agents/search", params));
      }

      case "agents-detail": {
        if (!input.agentID) return res.status(400).json({ error: "agentID required" });
        return res.json(await ab("agents/detail", {
          agentID: input.agentID,
          includeActivities: 1
        }));
      }

      // ── CARRIERS ─────────────────────────────────────────────
      case "carriers-search": {
        const params = { limit: 0 };
        if (input.carrierName) params.carrierName = input.carrierName;
        return res.json(await ab("carriers/search", params));
      }

      // ── ACTIVITIES ───────────────────────────────────────────
      case "activities-list": {
        if (!input.entityID) return res.status(400).json({ error: "entityID required" });
        if (!input.entityTypeID) return res.status(400).json({ error: "entityTypeID required" });
        return res.json(await ab("activities/list", {
          entityID: input.entityID,
          entityTypeID: input.entityTypeID
        }));
      }

      // ── NOTES & ATTACHMENTS ──────────────────────────────────
      case "notes-list": {
        if (!input.entity_ID) return res.status(400).json({ error: "entity_ID required" });
        if (!input.entity_Type) return res.status(400).json({ error: "entity_Type required" });
        return res.json(await ab("notes/list", {
          entity_ID: input.entity_ID,
          entity_Type: input.entity_Type
        }));
      }

      // ── LEADS / SALES RECORDS ────────────────────────────────
      case "leads-detail": {
        if (!input.record_id) return res.status(400).json({ error: "record_id required" });
        return res.json(await ab("salesEnablement/Leads/detail", {
          record_id: input.record_id
        }));
      }

      case "leads-search-phone": {
        if (!input.PhoneNumberSearchQuery) return res.status(400).json({ error: "PhoneNumberSearchQuery required" });
        return res.json(await ab("salesEnablement/leads/searchphone", {
          PhoneNumberSearchQuery: input.PhoneNumberSearchQuery
        }));
      }

      // ── CONVENIENCE ACTIONS ──────────────────────────────────
      case "all-groups": {
        const groups = await ab("groups/search", { limit: 0 });
        if (!Array.isArray(groups)) return res.json(groups);
        const clients = groups.filter(g => {
          const type = (g.type || "").toLowerCase();
          const name = (g.groupName || "").toLowerCase();
          return (
            type.includes("client") ||
            type.includes("peo") ||
            type === "group" ||
            type === "business" ||
            type === "company" ||
            type.includes("llc") ||
            type.includes("corp") ||
            type.includes("inc") ||
            name.includes("evans") ||
            name.includes("careoperative")
          ) && !type.includes("prospect");
        });
        return res.json({ count: clients.length, groups: clients.map(simplifyGroup) });
      }

      case "client-snapshot": {
        if (!input.groupID) return res.status(400).json({ error: "groupID required" });
        const [detail, notes] = await Promise.all([
          ab("groups/detail", { groupID: input.groupID, includeActivities: 1 }),
          ab("notes/list", { entity_ID: input.groupID, entity_Type: "Group" })
        ]);
        return res.json({ detail, notes });
      }

      default:
        console.log("Unknown action:", action);
        return res.status(400).json({
          error: `Unknown action: ${action}`,
          availableActions: [
            "groups-search", "groups-detail",
            "individuals-search", "individuals-detail",
            "policies-search", "policies-detail",
            "agents-search", "agents-detail",
            "carriers-search",
            "activities-list",
            "notes-list",
            "leads-detail", "leads-search-phone",
            "all-groups", "client-snapshot"
          ]
        });
    }
  } catch (err) {
    console.error("AGENCYBLOC FUNCTION ERROR:", err.message, err.stack);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } }
};
