// ============================================================
// claude.js — Sends ticket data to Claude for deep analysis
// Separate from the MCP lookup so concerns are cleanly split.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

/**
 * Analyzes a ticket object and returns structured insights.
 * @param {Object} ticket - The structured ticket data from connectwise.js
 * @returns {Object} - Analysis with summary, sentiment, urgency, recommendation
 */
export async function analyzeTicket(ticket) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are an IT service desk analyst for Blue Fox Group, a managed service provider. 
You analyze ConnectWise support tickets and return structured JSON insights to help the team 
understand the situation at a glance in a Teams chat. Be direct, concise, and use MSP context.

Return ONLY valid JSON with this exact shape:
{
  "oneLiner": string,           // One sentence: what is this ticket about?
  "sentiment": "positive" | "neutral" | "frustrated" | "escalating" | "resolved",
  "sentimentReason": string,    // 1 sentence explaining the sentiment read
  "urgencyLevel": "low" | "medium" | "high" | "critical",
  "urgencyReason": string,      // Why this urgency level?
  "keyHistory": string[],       // 3-5 bullet strings summarizing the story arc of notes
  "recommendedNextStep": string, // What should the assigned tech do right now?
  "watchouts": string[]         // 0-3 things the team should be aware of (SLA risk, repeat issue, etc.)
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this ConnectWise ticket:\n\n${JSON.stringify(ticket, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) return getDefaultAnalysis();

  try {
    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis() {
  return {
    oneLiner: "Unable to analyze ticket at this time.",
    sentiment: "neutral",
    sentimentReason: "Analysis unavailable.",
    urgencyLevel: "medium",
    urgencyReason: "Could not determine urgency.",
    keyHistory: [],
    recommendedNextStep: "Review ticket manually in ConnectWise.",
    watchouts: [],
  };
}
