# Daybook for Chrome

A side panel with **today only**: a **Tasks** tab and a **Calendar** tab, in the website's own design. Click the toolbar icon to open it beside any page. You log in with the same email and password as the website.

- **Tasks:** today's tasks. Tick one off, or add a new one for today.
- **Calendar:** today's events as the website's Day timeline. Events come from Google when Google is connected on the website, otherwise from Daybook's own calendar. Read-only.
- No week or month view, and no moving between days. The panel always shows today and rolls over at midnight.

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

`node scripts/extension-load.mjs` loads the real build into Edge and checks that it starts. `node scripts/extension-shots.mjs <name>` takes the screenshots for the change log.

## Putting it on the Chrome Web Store (later)

- Make sure `DAYBOOK_SITE_URL` is the real address, run `npm run extension`, and zip the **contents** of `extension/dist`.
- You need a one-time $5 developer fee, a **privacy policy** page (the panel stores only the Daybook login on the device and talks only to your Supabase project and your Daybook site), a 128px icon (already in `icons/`), and at least one screenshot (1280×800 or 640×400).
- Permissions asked: `storage` (keeps you logged in) and `sidePanel` (the panel), plus access to your Supabase address and your Daybook address.
- Google sign-in lives on your server, so the extension needs no Google verification of its own.

## How it is built

`src/` is a small React app bundled by esbuild (`build.mjs`). It reuses the website's date, repeat and layout code from `lib/`, and its colours, fonts and sizes are copied from the website (`src/panel.css`). Data: tasks and (without Google) events come straight from Supabase with the logged-in person's own access; Google events come from the website's API.
