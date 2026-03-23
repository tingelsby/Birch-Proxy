// api/config.js — FIXED
// Previous version was exposing ANTHROPIC_API_KEY publicly — removed.
// Only expose non-sensitive config that Copilot Studio or the frontend needs.

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    status: "ok",
    agencyBlocReady: !!(process.env.AGENCYBLOC_SID && process.env.AGENCYBLOC_KEY),
    anthropicReady: !!process.env.ANTHROPIC_API_KEY
    // Never expose actual key values here
  });
}
