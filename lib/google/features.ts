/**
 * Which parts of Google the app uses. Each one is a switch, so a later phase turns it on
 * (and its permission is asked for) without rewriting anything.
 * Pure types only: the browser may import this.
 */
export interface GoogleFeatures {
  /** Read the user's list of calendars (needs the calendar list permission). Off: only the primary calendar is used. */
  calendarList: boolean;
  /** Read and write Google Tasks (needs the Tasks permission). Off: tasks stay in the Daybook account. */
  tasks: boolean;
}
