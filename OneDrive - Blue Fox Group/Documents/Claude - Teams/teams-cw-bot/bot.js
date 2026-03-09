// ============================================================
// bot.js — Core bot logic
// Watches every Teams message for CW ticket numbers,
// pulls data via your MCP server, summarizes with Claude.
// ============================================================

import { ActivityHandler, MessageFactory, CardFactory } from "botbuilder";
import { lookupTicket } from "./connectwise.js";
import { analyzeTicket } from "./claude.js";
import { buildTicketCard } from "./card.js";

// Matches patterns like: #12345, CW-12345, CW12345, ticket 12345, T#12345
const TICKET_PATTERN = /(?:CW-?|#|T#|ticket\s*)(\d{4,6})/gi;

export class CWTicketBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      const messageText = context.activity.text || "";

      // Find all ticket numbers mentioned in the message
      const ticketNumbers = [...messageText.matchAll(TICKET_PATTERN)]
        .map((m) => m[1])
        .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

      if (ticketNumbers.length > 0) {
        // Show a "typing" indicator while we work
        await context.sendActivity({ type: "typing" });

        // Process up to 3 tickets at once (avoid spam)
        const toProcess = ticketNumbers.slice(0, 3);

        for (const ticketId of toProcess) {
          try {
            // 1. Pull ticket data from ConnectWise via your MCP server
            const ticketData = await lookupTicket(ticketId);

            if (!ticketData) {
              await context.sendActivity(`⚠️ Ticket #${ticketId} not found in ConnectWise.`);
              continue;
            }

            // 2. Send to Claude for analysis
            const analysis = await analyzeTicket(ticketData);

            // 3. Build and send an Adaptive Card with results
            const card = buildTicketCard(ticketData, analysis);
            await context.sendActivity(MessageFactory.attachment(CardFactory.adaptiveCard(card)));

          } catch (err) {
            console.error(`Error processing ticket ${ticketId}:`, err);
            await context.sendActivity(`⚠️ Error looking up ticket #${ticketId}. I'll try again if you re-post it.`);
          }
        }

        if (ticketNumbers.length > 3) {
          await context.sendActivity(`_I found ${ticketNumbers.length} ticket numbers — I only looked up the first 3 to avoid flooding the chat._`);
        }
      }

      await next();
    });
  }
}
