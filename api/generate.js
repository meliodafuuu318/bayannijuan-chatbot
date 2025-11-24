// api/generate.js
import { CohereClient } from "cohere-ai";

export default async function handler(req, res) {
  // Basic CORS handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const API_KEY = process.env.CO_API_KEY;
  if (!API_KEY) {
    console.error("Missing CO_API_KEY");
    return res.status(500).json({ error: "Server missing API key" });
  }

  const { message, conversationHistory = [] } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

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

    // Convert your old chatHistory → v2 messages
    const messages = [
      { role: "system", content: systemContext },
      ...conversationHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // 🚀 NEW v2 chat API
    const aiResponse = await client.v2.chat({
      model: "command-a-reasoning-08-2025",
      messages,
      temperature: 0.3,
    });

    // v2 API returns: response.message.content[n].text
    const contentArr = aiResponse?.message?.content || [];
    const textObj = contentArr.find(c => c.type === "text");
    const botText = textObj?.text || null;

    if (!botText) {
      console.error("Invalid Cohere response:", aiResponse);
      return res.status(502).json({
        error: "Invalid response from AI provider",
        details: aiResponse,
      });
    }

    return res.status(200).json({
      response: botText,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({
      error: "AI generation failed",
      message: err.message || String(err),
    });
  }
}
