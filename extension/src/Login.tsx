import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Controls";
import { LogoMark } from "@/components/shell/Logo";
import { SITE } from "./config";
import { signIn, type Account } from "./data";

/** The website's log-in form (components/home/AuthDialog.tsx), on its own page. New accounts are made on the website. */
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
      onSignedIn(await signIn(email.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg px-3">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-[1.45rem] leading-none tracking-tight">Daybook</span>
        </div>
      </header>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h1 className="font-display text-[1.5rem] leading-none">Log in</h1>
        <p className="text-sm text-text-2">Use your Daybook email and password.</p>
        <Field label="Email">
          <Input data-autofocus type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : "Log in"}
        </Button>
        <p className="text-sm text-text-2">
          New here?{" "}
          <a className="underline" href={SITE} target="_blank" rel="noreferrer">
            Create your account on Daybook
          </a>
          , then log in.
        </p>
      </form>
    </div>
  );
}
