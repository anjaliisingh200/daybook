"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AuthDialog } from "./AuthDialog";

/** The home page: one hero section. "Log in" opens the sign-in popup; signing in opens the app. */
export function Hero() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-6 max-w-2xl font-display text-5xl leading-[1.05] text-text md:text-6xl">Your days and your tasks, in one calm place.</h1>
      <p className="mt-4 max-w-md text-base text-text-2">A calendar and a task board that stay in step. Plan the week, move work between days, and finish what matters.</p>
      <Button
        variant="primary"
        size="lg"
        className="mt-8"
        onClick={() => (isSupabaseConfigured ? setOpen(true) : router.push("/calendar"))}
      >
        {isSupabaseConfigured ? "Log in" : "Open Daybook"}
      </Button>
      {isSupabaseConfigured && <AuthDialog open={open} onClose={() => setOpen(false)} />}
    </main>
  );
}
