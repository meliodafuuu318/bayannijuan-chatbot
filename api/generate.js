import { CohereClient } from "cohere-ai";

// Initialize the Cohere client with your API key
const client = new CohereClient({ apiKey: process.env.CO_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, conversationHistory = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Message is required" });
  }

  // System context for disaster preparedness
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
    // Build conversation history for context
    const chatHistory = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'USER' : 'CHATBOT',
      message: msg.content
    }));

    const response = await client.chat({
      model: "command-r-plus",
      message: message,
      chatHistory: chatHistory,
      preamble: systemContext,
      temperature: 0.3, // Lower temperature for more factual, consistent responses
      connectors: [{ id: "web-search" }], // Enable web search for official sources
    });

    const botResponse = response.text || response.message;

    if (!botResponse) {
      return res.status(500).json({ error: "Invalid response from AI" });
    }

    // Return the response with metadata
    return res.status(200).json({
      response: botResponse,
      sources: response.citations || [], // Include any citations if available
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Chatbot error:", error);
    return res.status(500).json({ 
      error: "Failed to generate response",
      fallback: "I'm having trouble connecting right now. Please try again or contact emergency services at 911 for urgent assistance."
    });
  }
}