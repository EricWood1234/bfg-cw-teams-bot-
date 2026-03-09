// ============================================================
// card.js — Builds the Teams Adaptive Card for ticket display
// Uses Adaptive Card schema v1.5 (supported in Teams)
// ============================================================

const SENTIMENT_EMOJI = {
  positive: "😊",
  neutral: "😐",
  frustrated: "😤",
  escalating: "🔥",
  resolved: "✅",
};

const URGENCY_COLOR = {
  low: "Good",        // Green
  medium: "Warning",  // Yellow
  high: "Attention",  // Red
  critical: "Attention",
};

const URGENCY_EMOJI = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
  critical: "🚨",
};

/**
 * Builds an Adaptive Card JSON object for display in Teams.
 * @param {Object} ticket - Raw ticket data
 * @param {Object} analysis - Claude's analysis output
 */
export function buildTicketCard(ticket, analysis) {
  const cwUrl = `https://na.myconnectwise.net/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid=${ticket.id}`;

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      // Header bar
      {
        type: "Container",
        style: "emphasis",
        items: [
          {
            type: "ColumnSet",
            columns: [
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: `🎫 Ticket #${ticket.id} — ${ticket.company}`,
                    weight: "Bolder",
                    size: "Medium",
                    wrap: true,
                  },
                  {
                    type: "TextBlock",
                    text: ticket.summary,
                    wrap: true,
                    spacing: "None",
                    isSubtle: true,
                  },
                ],
              },
              {
                type: "Column",
                width: "auto",
                items: [
                  {
                    type: "TextBlock",
                    text: ticket.status,
                    weight: "Bolder",
                    color: ticket.status?.toLowerCase().includes("closed") ? "Good" : "Accent",
                  },
                ],
              },
            ],
          },
        ],
      },

      // AI Summary
      {
        type: "Container",
        spacing: "Medium",
        items: [
          {
            type: "TextBlock",
            text: `🤖 ${analysis.oneLiner}`,
            wrap: true,
            weight: "Bolder",
          },
        ],
      },

      // Key stats row
      {
        type: "ColumnSet",
        spacing: "Small",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "FactSet",
                facts: [
                  { title: "Assigned To", value: ticket.assignedTo || "Unassigned" },
                  { title: "Board", value: ticket.board || "—" },
                  { title: "Contact", value: ticket.contact || "—" },
                  { title: "Age", value: `${ticket.ageInDays ?? "?"} days` },
                  { title: "Total Hours", value: `${ticket.totalHours ?? 0} hrs` },
                ],
              },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "TextBlock",
                text: `${SENTIMENT_EMOJI[analysis.sentiment] || "😐"} ${analysis.sentiment}`,
                weight: "Bolder",
              },
              {
                type: "TextBlock",
                text: analysis.sentimentReason,
                wrap: true,
                isSubtle: true,
                size: "Small",
                maxLines: 2,
              },
              {
                type: "TextBlock",
                text: `${URGENCY_EMOJI[analysis.urgencyLevel]} ${analysis.urgencyLevel} urgency`,
                weight: "Bolder",
                color: URGENCY_COLOR[analysis.urgencyLevel],
                spacing: "Small",
              },
            ],
          },
        ],
      },

      // History timeline
      ...(analysis.keyHistory?.length > 0
        ? [
            {
              type: "TextBlock",
              text: "📋 History",
              weight: "Bolder",
              spacing: "Medium",
            },
            {
              type: "RichTextBlock",
              inlines: analysis.keyHistory.map((item, i) => ({
                type: "TextRun",
                text: `• ${item}\n`,
              })),
            },
          ]
        : []),

      // Recommended next step
      {
        type: "Container",
        style: "accent",
        spacing: "Medium",
        items: [
          {
            type: "TextBlock",
            text: `➡️ Next Step: ${analysis.recommendedNextStep}`,
            wrap: true,
            weight: "Bolder",
          },
        ],
      },

      // Watchouts (if any)
      ...(analysis.watchouts?.length > 0
        ? [
            {
              type: "TextBlock",
              text: `⚠️ Watch: ${analysis.watchouts.join(" · ")}`,
              wrap: true,
              color: "Attention",
              size: "Small",
              spacing: "Small",
            },
          ]
        : []),
    ],

    // Open in ConnectWise button
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Open in ConnectWise",
        url: cwUrl,
      },
    ],
  };
}
