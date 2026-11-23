/** Thrown when the saved login is gone or no longer accepted. The panel shows the login form. */
export class SignedOutError extends Error {
  constructor() {
    super("You are signed out. Log in again.");
    this.name = "SignedOutError";
  }
}
