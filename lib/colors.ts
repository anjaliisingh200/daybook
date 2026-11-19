/**
 * Event / calendar / list colours.
 * A muted, warm palette. Deliberately contains no blue and no teal.
 */
export const PALETTE: Record<string, { name: string; hex: string }> = {
  terracotta: { name: "Terracotta", hex: "#b5614a" },
  clay: { name: "Clay", hex: "#a9795a" },
  ochre: { name: "Ochre", hex: "#b88f3e" },
  olive: { name: "Olive", hex: "#7b8450" },
  sage: { name: "Sage", hex: "#8a9c7e" },
  moss: { name: "Moss", hex: "#5d7152" },
  rose: { name: "Rose", hex: "#b4757e" },
  plum: { name: "Plum", hex: "#86596f" },
  taupe: { name: "Taupe", hex: "#8c7b6b" },
  charcoal: { name: "Charcoal", hex: "#58534b" },
};

export const PALETTE_KEYS = Object.keys(PALETTE);

export function hexOf(key: string | undefined): string {
  if (key && key.startsWith("#")) return key;
  return (key && PALETTE[key]?.hex) || PALETTE.taupe.hex;
}

/** Accent colour choices for the whole interface. */
export const ACCENTS: Record<string, { name: string; light: string; hover: string }> = {
  olive: { name: "Olive", light: "#646b3f", hover: "#555b35", },
  terracotta: { name: "Terracotta", light: "#a5543f", hover: "#904734", },
  taupe: { name: "Taupe", light: "#7a6a5a", hover: "#695a4b", },
  charcoal: { name: "Charcoal", light: "#3b3835", hover: "#2a2825", },
  plum: { name: "Plum", light: "#764d63", hover: "#653f54", },
  ochre: { name: "Ochre", light: "#936d1f", hover: "#7e5b16", },
};
