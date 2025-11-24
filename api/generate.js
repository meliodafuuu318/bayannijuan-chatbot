// api/generate.js (or .ts depending on your app)
import { CohereClient } from "cohere-ai"; // ensure this is installed
export default async function handler(req, res) {
  // Basic CORS handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Validate environment
  const API_KEY = process.env.CO_API_KEY;
  if (!API_KEY) {
    console.error('Missing CO_API_KEY in environment');
    return res.status(500).json({ error: "Server misconfiguration: missing API key" });
  }

  const { message, conversationHistory = [] } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  // Build clearer system prompt/preamble if needed
  const systemContext = `You are "Mang Juan", an AI assistant specializing in disaster preparedness, response, and recovery for the Philippines. Your role is to:

1. Help people prepare for natural disasters (typhoons, floods, earthquakes, etc.)
2. Provide accurate emergency response guidance
3. Offer recovery and relief information
4. Share safety protocols and evacuation procedures

CRITICAL GUIDELINES:
- Only provide information from official sources like:
  * NDRRMC (National Disaster Risk Reduction and Management Council)
  * PAGASA (Philippine Atmospheric, Geophysical and Astronomical Services Administration)
  * Philippine Red Cross
  * Local Government Units (LGUs)
  * WHO and CDC for health-related disasters
  * PHIVOLCS for earthquakes and volcanic activity
  
- Always cite your sources when providing specific statistics, warnings, or protocols
- If you don't have verified information, clearly state that and recommend contacting official authorities
- Prioritize life-saving information and immediate safety
- Use simple, clear Filipino-English (Taglish) when appropriate for better understanding
- Never provide unverified rumors or speculation
- In emergencies, always remind users to call official hotlines: 911 (NDRRMC), 143 (Red Cross)

Respond in a helpful, calm, and authoritative manner. Keep responses concise but complete.`;

  try {
    const client = new CohereClient({ apiKey: API_KEY });

    // Build chatHistory for SDK if required by your SDK signature:
    const chatHistory = (conversationHistory || []).map(msg => ({
      role: msg.role === 'user' ? 'USER' : 'ASSISTANT',
      content: msg.content
    }));

    // If your installed SDK uses a different method name, update accordingly.
    // Here's a defensive approach that checks for `client.chat` availability:
    if (typeof client.chat !== 'function') {
      console.error('Cohere client.chat not available. SDK version mismatch?');
      return res.status(500).json({ error: 'Cohere SDK: client.chat not available on server' });
    }

    const aiResponse = await client.chat({
      model: "command-a-reasoning-08-2025",
      message,
      chatHistory,
      preamble: systemContext,
      temperature: 0.3
    });

    // aiResponse may have different shape depending on SDK; attempt common fields:
    const botText = aiResponse?.text || aiResponse?.response || aiResponse?.message || null;
    if (!botText) {
      console.error('Invalid AI response shape', JSON.stringify(aiResponse));
      return res.status(502).json({ error: "Invalid response from AI provider", details: aiResponse });
    }

    return res.status(200).json({ response: botText, timestamp: new Date().toISOString() });
  } catch (err) {
    // Very important: log full error server-side (Vercel logs)
    console.error('Handler error:', err && err.stack ? err.stack : err);
    // Return safe message + include err.message to help debugging (not sensitive)
    return res.status(500).json({
      error: "AI generation failed",
      message: err?.message || String(err)
    });
  }
}
