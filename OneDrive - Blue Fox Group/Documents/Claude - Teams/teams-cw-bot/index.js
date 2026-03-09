// ============================================================
// Blue Fox Group — ConnectWise Teams Bot
// index.js — Entry point
// ============================================================

import express from "express";
import { CloudAdapter, ConfigurationBotFrameworkAuthentication } from "botbuilder";
import { CWTicketBot } from "./bot.js";
import { config } from "./config.js";

const app = express();
app.use(express.json());

// --- Bot Framework Auth ---
const botAuth = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: config.TEAMS_APP_ID,
  MicrosoftAppPassword: config.TEAMS_APP_PASSWORD,
  MicrosoftAppType: "SingleTenant",
  MicrosoftAppTenantId: config.TEAMS_TENANT_ID,
});

const adapter = new CloudAdapter(botAuth);

// --- Error handler ---
adapter.onTurnError = async (context, error) => {
  console.error("Bot error:", error);
  await context.sendActivity("Something went wrong looking up that ticket. Check the logs.");
};

// --- Bot instance ---
const bot = new CWTicketBot();

// --- Teams Bot endpoint (Azure Bot Service posts here) ---
app.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

// --- Health check ---
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(config.PORT, () => {
  console.log(`Blue Fox CW Bot running on port ${config.PORT}`);
});
