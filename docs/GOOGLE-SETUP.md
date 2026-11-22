# Connecting Google Calendar

One-time setup, about 15 minutes. You do this in Google Cloud; the app code is already written.
Everything here is free and needs no billing account.

**Phase 1 is Google Calendar events only**, from your primary calendar. Google Tasks and the list of your other calendars are switched off for now (see "Later" at the end), so you do not need the Tasks API or those permissions.

## 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> and sign in with the Google account whose calendar you want to use.
2. Top bar → project picker → **New project**. Name it `Daybook`. Create it, then make sure it is selected.

## 2. Turn on the Calendar API

**APIs & Services → Library**, search for **Google Calendar API**, open it and press **Enable**.
(You do not need the Google Tasks API yet.)

## 3. Set up the consent screen

**APIs & Services → OAuth consent screen** (newer consoles call it **Google Auth Platform**).

1. User type: **External**. App name `Daybook`. Support email and developer email: yours.
2. **Scopes** → add just this one:
   - `https://www.googleapis.com/auth/calendar.events`
3. **Publishing status: set it to "In production"** (press **Publish app**).
   - **Do not leave it on "Testing".** In Testing, Google cancels the connection every 7 days.
   - Google will show an "unverified app" warning when you connect. Click **Advanced → Go to Daybook (unsafe)** once. That is expected for a personal app; you are the only user.

## 4. Create the OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**
- Application type: **Web application**. Name `Daybook web`.
- **Authorised redirect URIs** (add both):
  - `http://localhost:3000/api/google/callback`
  - `https://<your-vercel-address>/api/google/callback`  (the address Vercel gave the app; no trailing slash)
- Create. Copy the **Client ID** and **Client secret**.

## 5. Add the values to the app

Make a token key (any long random string):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**On your computer:** put these three lines in `.env.local` (see `.env.local.example`), then restart `npm run dev`. To use your real account locally, also remove the `# ` from the two Supabase lines in that file.

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_TOKEN_KEY=...
```

**On Vercel:** Project → Settings → Environment Variables → add the same three, for Production (and Preview if you use it). Redeploy.
These are secrets: do not add `NEXT_PUBLIC_` in front of them, and never paste them into chat or commit them.

## 6. Create the database table

Supabase → SQL Editor → New query → paste the **whole** `supabase/schema.sql` → Run.
It is safe to run again; it only adds the new `google_connections` table (and re-applies the permissions).

## 7. Connect

Open the app (signed in) → round letter menu → **Connect Google account**. Approve on Google's screen, leaving the permission ticked.
You come back to the app with the events from your primary Google calendar.

## What works in this first version

- **Reading your primary calendar:** its events from 90 days back to a year ahead, repeats expanded, cancelled and declined events left out. The app asks Google for `primary`, so it never needs your list of calendars.
- **Your tasks stay in your Daybook account** and work as before while Google is connected. They are not sent to Google Tasks.
- **Read-only calendar for now.** Adding or editing an event while connected shows a message instead of saving. Writing back is the next phase.
- Disconnect any time: Settings → Account & sync → **Disconnect Google**. This also cancels the permission at Google.

## If something goes wrong

- *"Google isn't set up on this server yet"*: the three values are missing or the token key is under 24 characters. Restart the dev server after editing `.env.local`.
- *Google says "redirect_uri_mismatch"*: the address in step 4 does not exactly match where the app is running (including `http` vs `https` and the port).
- *"Daybook needs permission to see and edit your calendar events"*: the permission box was unticked on Google's screen. Connect again and leave it ticked.
- *"Google wouldn't share your calendar"*: the Google Calendar API is not enabled for the project (step 2), or access was refused.
- *Stuck on "Couldn't load your data: permission denied for table google_connections"*: step 6 was skipped.
- *"Google needs to be connected again"* appears: Google cancelled the permission (you removed it in your Google account, or the password changed). Press **Reconnect**.

## Later (switched off in this phase, kept ready)

The code for these is still in the project behind two switches in `lib/google/config.ts` (`FEATURES`). Turning one on also adds its permission to the consent request, so you would connect again once.

- **Calendar list** (`calendarList`): all your calendars, with their names and colours, instead of only the primary one. Needs the `calendar.calendarlist.readonly` permission.
- **Google Tasks** (`tasks`): your Google task lists and tasks instead of the Daybook ones. Needs the Tasks API enabled in step 2 and the `tasks` permission.
