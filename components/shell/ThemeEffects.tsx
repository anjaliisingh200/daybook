"use client";
import { useEffect } from "react";
import { usePrefs } from "@/lib/store/prefs";
import { ACCENTS } from "@/lib/colors";

/** Writes the appearance preferences onto <html>. Light only: there is no dark mode. */
export function ThemeEffects() {
  const density = usePrefs((p) => p.density);
  const fontSize = usePrefs((p) => p.fontSize);
  const accent = usePrefs((p) => p.accent);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "light";
    const a = ACCENTS[accent] ?? ACCENTS.olive;
    root.style.setProperty("--accent", a.light);
    root.style.setProperty("--accent-hover", a.hover);
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
  useEffect(() => {
    document.documentElement.dataset.fontsize = fontSize;
  }, [fontSize]);
  return null;
}
