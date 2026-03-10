export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ 
    anthropicKey: process.env.ANTHROPIC_API_KEY || "" 
  });
}
