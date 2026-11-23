import { useState } from "react";
import { backend } from "./backend";
import { Brand, SITE } from "./common";
import type { Account } from "./data";

/** Log in with the same email and password as the Daybook website. New accounts are made on the website. */
export function Login({ onSignedIn }: { onSignedIn: (a: Account) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await backend.signIn(email.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <Brand />
      </header>
      <form className="login" onSubmit={submit}>
        <h1>Log in</h1>
        <p className="hint">Use your Daybook email and password.</p>
        <label>
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary wide" disabled={busy}>
          {busy ? "Please wait…" : "Log in"}
        </button>
        <p className="hint">
          New here? <a href={SITE} target="_blank" rel="noreferrer">Create your account on Daybook</a>, then log in.
        </p>
      </form>
    </div>
  );
}
