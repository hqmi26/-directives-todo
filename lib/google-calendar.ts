import { google } from "googleapis";
import { prisma } from "./prisma";

// Build an authenticated OAuth2 client for a given user
export async function getOAuthClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google account linked for this user.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token:  account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date:   account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh and persist the new token if it changed
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token || tokens.access_token) {
      await prisma.account.update({
        where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
        data: {
          access_token:  tokens.access_token  ?? account.access_token,
          refresh_token: tokens.refresh_token ?? account.refresh_token,
          expires_at:    tokens.expiry_date   ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
        },
      });
    }
  });

  return oauth2Client;
}

// List all user's calendars so they can pick which one to sync with
export async function listCalendars(userId: string) {
  const auth     = await getOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const res      = await calendar.calendarList.list();
  return (res.data.items ?? []).map((c) => ({
    id:      c.id!,
    summary: c.summary ?? "Unnamed",
    primary: c.primary ?? false,
  }));
}

// Create a Google Calendar event from a task
export async function createCalendarEvent(
  userId:     string,
  calendarId: string,
  task: {
    id:          string;
    title:       string;
    description?: string | null;
    dueDate?:    Date | null;
    priority:    string;
  }
) {
  const auth     = await getOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const due = task.dueDate ?? new Date();

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary:     task.title,
      description: task.description
        ? `${task.description}\n\n[Priority: ${task.priority}] [Todo App Task ID: ${task.id}]`
        : `[Priority: ${task.priority}] [Todo App Task ID: ${task.id}]`,
      start: {
        date: due.toISOString().split("T")[0], // all-day event
      },
      end: {
        date: due.toISOString().split("T")[0],
      },
      colorId: { high: "11", medium: "5", low: "2" }[task.priority] ?? "5",
      reminders: {
        useDefault: false,
        overrides:  [{ method: "popup", minutes: 60 }],
      },
    },
  });

  return event.data.id!;
}

// Update an existing Google Calendar event
export async function updateCalendarEvent(
  userId:      string,
  calendarId:  string,
  eventId:     string,
  task: {
    title:        string;
    description?: string | null;
    dueDate?:     Date | null;
    priority:     string;
    completed:    boolean;
  }
) {
  const auth     = await getOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const due = task.dueDate ?? new Date();

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary:     task.completed ? `✓ ${task.title}` : task.title,
      description: task.description ?? "",
      start: { date: due.toISOString().split("T")[0] },
      end:   { date: due.toISOString().split("T")[0] },
      colorId: task.completed
        ? "8"
        : ({ high: "11", medium: "5", low: "2" }[task.priority] ?? "5"),
    },
  });
}

// Delete a Google Calendar event
export async function deleteCalendarEvent(
  userId:     string,
  calendarId: string,
  eventId:    string
) {
  const auth     = await getOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId, eventId });
}
