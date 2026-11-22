/**
 * Google connection settings. Server only: nothing here may reach the browser.
 * `GOOGLE_TEST_ORIGIN` points every Google address at a local fake, for tests.
 */
import type { GoogleFeatures } from "./features";

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
 * What is switched on. Phase 1 is Google Calendar events only, from the primary calendar.
 * Turn a switch on later to bring that part of Google in (and its permission is requested with it).
 */
export const FEATURES: GoogleFeatures = { calendarList: false, tasks: false };

const AUTH = "https://www.googleapis.com/auth";
/** Read and write events. The only permission Phase 1 asks for. */
const EVENTS = `${AUTH}/calendar.events`;
/** Later: the user's list of calendars, with their colours and names. */
const CALENDAR_LIST = `${AUTH}/calendar.calendarlist.readonly`;
/** Later: Google Tasks. */
const TASKS = `${AUTH}/tasks`;

/** The permissions to ask for, for a set of switches. Always the events permission, plus one for each part switched on. */
export const scopesFor = (f: GoogleFeatures): string[] => [EVENTS, ...(f.calendarList ? [CALENDAR_LIST] : []), ...(f.tasks ? [TASKS] : [])];

export const SCOPES = scopesFor(FEATURES);

/** Everything asked for is needed. The consent screen lets people untick permissions, so the callback checks. */
export const REQUIRED_SCOPES = SCOPES;
