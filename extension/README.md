# Daybook for Chrome

A side panel for **one day at a time** (today when it opens): a **Tasks** tab and a **Calendar** tab. The screens are the website's own, not copies: its task cards, Day timeline, task details, new task and new event forms, account menu and toasts run inside the panel (the phone layout, since the panel is narrow). Click the toolbar icon to open it beside any page. You log in with the same email and password as the website.

- **Tasks:** the day's tasks as the website's task cards. Click one for its details, tick it, or add one with the **+** button or "Add task".
- **Calendar:** the day's events as the website's Day timeline. Tap the timeline or the **+** button for a new event. Events come from Google when Google is connected on the website, otherwise from Daybook's own calendar. While Google is connected the website treats events as read-only, so the panel does too.
- The day row is at the top, with a chevron at each end to step to the previous or next day. The tab stays as it is when you change day. There is no week or month view. The panel opens on today and follows midnight until you step to another day.

## Try it in Chrome (your own copy)

1. In `.env.local`, make sure the two Supabase lines are on (the same ones the website uses), and add one more line with the address where Daybook is hosted. It is not a secret:
   ```
   DAYBOOK_SITE_URL=https://your-daybook-address.vercel.app
   ```
   Without it the panel looks for the site at `http://localhost:3000`, which is only right while you run the website on your computer.
2. Build it:
   ```bash
   npm run extension
   ```
3. In Chrome open `chrome://extensions`, switch on **Developer mode** (top right), click **Load unpacked**, and choose the folder `extension/dist`.
4. Click the puzzle-piece icon, pin **Daybook**, then click its icon. The panel opens on the right. Log in.

After you change any code, run `npm run extension` again and press the refresh arrow on the Daybook card in `chrome://extensions`.

## Google events need the website updated

The panel reads Google events through the website's server (`/api/google/snapshot`), which now also accepts the login the extension sends. Until the website with that change is deployed to Vercel, the Calendar tab shows Daybook's own events, not Google's. Tasks work either way.

## Look at it without logging in

```bash
npm run extension -- --demo     # builds sample data into extension/dist-demo
node extension/serve.mjs        # http://localhost:3300
```

`node scripts/extension-flows.mjs` clicks through the panel on sample data and checks the flows. `node scripts/extension-signed-in.mjs` runs the real build logged in against a pretend Supabase and a pretend Daybook site (no real account). `node scripts/extension-load.mjs` loads the real build into Edge and checks that it starts. `node scripts/extension-shots.mjs <name>` takes the screenshots for the change log.

## Putting it on the Chrome Web Store (later)

- Make sure `DAYBOOK_SITE_URL` is the real address, run `npm run extension`, and zip the **contents** of `extension/dist`.
- You need a one-time $5 developer fee, a **privacy policy** page (the panel stores only the Daybook login on the device and talks only to your Supabase project and your Daybook site), a 128px icon (already in `icons/`), and at least one screenshot (1280×800 or 640×400).
- Permissions asked: `storage` (keeps you logged in) and `sidePanel` (the panel), plus access to your Supabase address and your Daybook address.
- Google sign-in lives on your server, so the extension needs no Google verification of its own.

## How it is built

The panel runs the website's own code (`components/` and `lib/`), so a change to those on the website shows up in the extension after the next `npm run extension`. Two small adapters in `build.mjs` make that possible: the browser Supabase client is the extension's (the login lives in extension storage), and the website's calls to `/api/google/...` are sent to your Daybook site with the login as an `Authorization` header. The stylesheet is the website's `app/globals.css`, built with Tailwind.


