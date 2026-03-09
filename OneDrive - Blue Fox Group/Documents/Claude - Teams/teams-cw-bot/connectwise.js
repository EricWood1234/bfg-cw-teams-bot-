// ============================================================
// connectwise.js — Direct ConnectWise REST API calls
// Base URL: https://api-na.myconnectwise.net/v4_6_release/apis/3.0
// Auth: Basic (companyId+publicKey:privateKey) via env vars
// All three endpoints verified live against BFG CW instance.
// ============================================================

import { config } from "./config.js";

const CW_BASE = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0";

function cwHeaders() {
  // ConnectWise Basic auth format: "companyId+publicKey:privateKey"
  const credentials = Buffer.from(
    `${config.CW_COMPANY_ID}+${config.CW_PUBLIC_KEY}:${config.CW_PRIVATE_KEY}`
  ).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    clientId: config.CW_CLIENT_ID,
  };
}

async function cwGet(path, params = {}) {
  const url = new URL(`${CW_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: cwHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CW API error ${res.status} on ${path}`);
  return res.json();
}

/**
 * Fetches a ConnectWise ticket with notes and time entries.
 * Returns a structured object ready to pass to Claude for analysis.
 */
export async function lookupTicket(ticketId) {
  // Fetch ticket, notes, and time entries in parallel
  const [ticket, notes, timeEntries] = await Promise.all([
    cwGet(`/service/tickets/${ticketId}`),
    cwGet(`/service/tickets/${ticketId}/notes`, {
      pageSize: 50,
      orderBy: "dateCreated asc",
      fields: "id,ticketId,text,detailDescriptionFlag,internalAnalysisFlag,resolutionFlag,externalFlag,dateCreated,createdBy,member",
    }),
    cwGet(`/time/entries`, {
      conditions: `(chargeToType='ServiceTicket' OR chargeToType='ProjectTicket') AND chargeToId=${ticketId}`,
      pageSize: 50,
      fields: "id,timeStart,member,actualHours,notes",
    }),
  ]);

  if (!ticket) return null;

  // Calculate age in days
  const dateEntered = new Date(ticket._info?.dateEntered || Date.now());
  const ageInDays = Math.floor((Date.now() - dateEntered.getTime()) / 86_400_000);

  // Normalize notes
  // Flag meanings:
  //   detailDescriptionFlag = initial ticket description
  //   internalAnalysisFlag  = internal tech-only note
  //   resolutionFlag        = resolution note
  //   externalFlag          = visible to client
  const normalizedNotes = (notes || []).map((n) => ({
    date: n.dateCreated,
    author: n.createdBy || n.member?.name || "Unknown",
    text: (n.text || "").replace(/\s+/g, " ").trim().slice(0, 1000),
    type: n.internalAnalysisFlag ? "internal" : "external",
    flags: {
      isInitialDescription: !!n.detailDescriptionFlag,
      isResolution: !!n.resolutionFlag,
      isInternal: !!n.internalAnalysisFlag,
    },
  }));

  const normalizedTime = (timeEntries || []).map((t) => ({
    date: t.timeStart,
    member: t.member?.name || "Unknown",
    hoursWorked: t.actualHours || 0,
    notes: (t.notes || "").slice(0, 300),
  }));

  const totalHours = normalizedTime.reduce((sum, t) => sum + t.hoursWorked, 0);

  return {
    id: ticket.id,
    summary: ticket.summary,
    status: ticket.status?.name,
    priority: ticket.priority?.name,
    priorityLevel: ticket.priority?.level,
    company: ticket.company?.name,
    contact: ticket.contact?.name,
    board: ticket.board?.name,
    assignedTo: ticket.assignedTo?.name || null,
    dateEntered: dateEntered.toISOString(),
    dateLastModified: ticket._info?.lastUpdated,
    ageInDays,
    notes: normalizedNotes,
    timeEntries: normalizedTime,
    totalHours: Math.round(totalHours * 10) / 10,
  };
}
