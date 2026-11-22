/**
 * Google connection settings. Server only: nothing here may reach the browser.
 * `GOOGLE_TEST_ORIGIN` points every Google address at a local fake, for tests.
 */
const TEST = process.env.GOOGLE_TEST_ORIGIN?.replace(/\/$/, "");

export const GOOGLE = {
  clientId: () => process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: () => process.env.GOOGLE_CLIENT_SECRET ?? "",
  tokenKey: () => process.env.GOOGLE_TOKEN_KEY ?? "",
  authUrl: TEST ? `${TEST}/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: TEST ? `${TEST}/token` : "https://oauth2.googleapis.com/token",
  revokeUrl: TEST ? `${TEST}/revoke` : "https://oauth2.googleapis.com/revoke",
  apiBase: TEST ?? "https://www.googleapis.com",
};

/** The short-lived cookie that carries the sign-in state between "Connect" and Google's reply. */
export const OAUTH_COOKIE = "daybook_google_oauth";

/** All three values must be set before anyone can connect. */
export const googleConfigured = () => GOOGLE.clientId() !== "" && GOOGLE.clientSecret() !== "" && GOOGLE.tokenKey().length >= 24;

/**
 * Everything the app will ever need, asked once so the connection never has to be redone.
 * Phase 1 only reads; writing arrives next and uses the same permissions.
 */
export const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.settings.readonly",
  "https://www.googleapis.com/auth/tasks",
];

/** The permissions the app cannot work without. The consent screen lets people untick them. */
export const REQUIRED_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.calendarlist.readonly", "https://www.googleapis.com/auth/tasks"];
