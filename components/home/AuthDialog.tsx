"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented } from "@/components/ui/Controls";
import { Modal } from "@/components/ui/Modal";

const friendly = (m: string) => (m === "Failed to fetch" ? "Couldn't reach the server. Check your connection and try again." : m);

/** Log in / sign up popup. A successful sign-in opens the app. */
export function AuthDialog({ open, onClose, initial = "in" }: { open: boolean; onClose: () => void; initial?: "in" | "up" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enter = () => {
    router.replace("/calendar");
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const sb = supabaseBrowser();
    if (mode === "in") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Failed to fetch" ? friendly(error.message) : "That email and password don't match. Try again.");
      else enter();
    } else {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) setError(friendly(error.message));
      else if (data.session) enter();
      else {
        setNotice("Check your email to confirm your account, then log in.");
        setMode("in");
      }
    }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "in" ? "Log in" : "Create your account"} size="sm">
      <form onSubmit={submit} className="space-y-4 p-5">
        <Segmented
          label="Log in or sign up"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError(null);
            setNotice(null);
          }}
          options={[
            { value: "in", label: "Log in" },
            { value: "up", label: "Sign up" },
          ]}
        />
        {mode === "up" && <p className="text-sm text-text-2">New accounts start empty.</p>}
        <Field label="Email">
          <Input data-autofocus type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-text-2">{notice}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Log in" : "Create account"}
        </Button>
      </form>
    </Modal>
  );
}
