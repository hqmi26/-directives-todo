# Todo App + Google Calendar Sync

A Next.js 14 todo app with real Google OAuth and two-way Google Calendar sync.

---

## Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Google OAuth
- **Prisma** + SQLite (local) / PostgreSQL (prod)
- **Google Calendar API** via `googleapis`

---

## Setup Guide

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Enable APIs**
4. Enable: **Google Calendar API**
5. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in app name, support email, developer email
   - Add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar`
   - Add your email as a test user
6. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy the **Client ID** and **Client Secret**

### 3. Configure environment variables

Copy `.env.local` and fill in your values:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to sign in with Google.

---

## How Google Calendar sync works

1. Add a task with a **due date**
2. A `+ Calendar` button appears on the task
3. Click it — if you have multiple calendars, a picker appears; otherwise it syncs to your primary calendar
4. The task is created as an **all-day event** on that date in Google Calendar
5. **Editing or completing** the task automatically updates the calendar event
6. **Deleting** the task removes the calendar event too
7. Click `✕` on the "Synced" badge to unlink without deleting the event

---

## Deploying to production

### Database
Swap SQLite for PostgreSQL in `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Vercel (recommended)
```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard. Update `NEXTAUTH_URL` to your production URL and add it to Google Cloud's authorized redirect URIs.

### After deploying
Add your production redirect URI in Google Cloud Console:
```
https://yourdomain.com/api/auth/callback/google
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── tasks/                # GET/POST tasks
│   │   ├── tasks/[id]/           # PATCH/DELETE task
│   │   ├── calendar/             # List Google Calendars
│   │   ├── calendar/sync/        # POST/DELETE calendar sync
│   │   └── profile/              # GET/PATCH user profile
│   ├── login/                    # Sign-in page
│   ├── layout.tsx
│   └── page.tsx                  # Protected home page
├── components/
│   ├── tasks/
│   │   ├── TodoApp.tsx           # Main app shell
│   │   ├── TaskItem.tsx          # Individual task row
│   │   ├── AddTaskForm.tsx       # New task form
│   │   └── CalendarSyncButton.tsx
│   └── ui/
│       └── SessionProvider.tsx
├── hooks/
│   ├── useTasks.ts               # Task CRUD + calendar sync
│   └── useCalendars.ts           # Fetch user's Google calendars
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma singleton
│   ├── google-calendar.ts        # Calendar API wrapper
│   └── tasks.ts                  # Server-side task helpers
└── prisma/
    └── schema.prisma
```
