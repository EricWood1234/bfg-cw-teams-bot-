// ============================================================
// config.js — Environment configuration
// Copy .env.example to .env and fill in your values
// ============================================================

import "dotenv/config";

export const config = {
  PORT: process.env.PORT || 3978,

  // --- Azure Bot Registration ---
  TEAMS_APP_ID: process.env.TEAMS_APP_ID,           // Azure AD App (client) ID
  TEAMS_APP_PASSWORD: process.env.TEAMS_APP_PASSWORD, // Azure AD client secret
  TEAMS_TENANT_ID: process.env.TEAMS_TENANT_ID,     // Your M365 tenant ID

  // --- Anthropic ---
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  // --- Your BFG ConnectWise MCP Server ---
  MCP_SERVER_URL: process.env.MCP_SERVER_URL || "https://mcp.bluefoxgroup.com/sse",
};

// Validate required values at startup
const required = ["TEAMS_APP_ID", "TEAMS_APP_PASSWORD", "TEAMS_TENANT_ID", "ANTHROPIC_API_KEY"];
for (const key of required) {
  if (!config[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}
