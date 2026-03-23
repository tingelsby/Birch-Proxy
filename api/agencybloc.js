// api/agencybloc.js
// Single unified AgencyBloc handler for all endpoints
// Copilot Studio calls: POST /api/agencybloc?action=<action>

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const sid = process.env.AGENCYBLOC_SID;
  const key = process.env.AGENCYBLOC_KEY;
  if (!sid || !key) return res.status(500).json({ error: "Missing AgencyBloc credentials" });

  const action = req.query.action;
  const input = req.body || {};

  const ab = async (endpoint, params = {}) => {
    const body = new URLSearchParams({ sid, key, ...params });
    const r = await fetch(`https://app.agencybloc.com/api/v1/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    return r.json();
  };

  try {
    switch (action) {

      // ── GROUPS ──────────────────────────────────────────────
      case "groups-search": {
        // Search all groups (clients, prospects, all types)
        // Pass groupName, type, fedTaxID, businessPhone, or leave empty for all
        const params = { limit: 0 }; // 0 = return all
        if (input.groupName) params.groupName = input.groupName;
        if (input.type) params.type = input.type;
        if (input.fedTaxID) params.fedTaxID = input.fedTaxID;
        if (input.businessPhone) params.businessPhone = input.businessPhone;
        return res.json(await ab("groups/search", params));
      }

      case "groups-detail": {
        // Full detail for a group including policies, activities, custom fields
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
        // entityTypeID: Group | Individual | Agent | Carrier | Lead
        if (!input.entityID) return res.status(400).json({ error: "entityID required" });
        if (!input.entityTypeID) return res.status(400).json({ error: "entityTypeID required" });
        return res.json(await ab("activities/list", {
          entityID: input.entityID,
          entityTypeID: input.entityTypeID
        }));
      }

      // ── NOTES & ATTACHMENTS ──────────────────────────────────
      case "notes-list": {
        // entity_Type: Agent | Group | Individual | Policy
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

      // ── FULL CLIENT SNAPSHOT ─────────────────────────────────
      // Convenience action: fetch group + all its policies + notes in one call
      case "client-snapshot": {
        if (!input.groupID) return res.status(400).json({ error: "groupID required" });
        const [detail, notes] = await Promise.all([
          ab("groups/detail", { groupID: input.groupID, includeActivities: 1 }),
          ab("notes/list", { entity_ID: input.groupID, entity_Type: "Group" })
        ]);
        return res.json({ detail, notes });
      }

      // ── ALL GROUPS SUMMARY ───────────────────────────────────
      // Returns all groups with type/status — useful for Copilot Studio overview queries
      case "all-groups": {
        const groups = await ab("groups/search", { limit: 0 });
        return res.json(groups);
      }

      default:
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
            "client-snapshot",
            "all-groups"
          ]
        });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } }
};
