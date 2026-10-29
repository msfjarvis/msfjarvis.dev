export const sitePalette = {
  light: {
    bg: "#ffffff",
    "bg-subtle": "#f7f7f7",
    border: "#e8e8e8",
    text: "#111111",
    "text-2": "#444444",
    "text-3": "#888888",
    accent: "#7a3d6e",
    "accent-subtle": "#e0c8db",
  },
  dark: {
    bg: "#1a1a1a",
    "bg-subtle": "#242424",
    border: "#343434",
    text: "#dddddd",
    "text-2": "#b0b0b0",
    "text-3": "#888888",
    accent: "#c084b8",
    "accent-subtle": "#4a2a45",
  },
} as const;

function declarations(palette: {
  [Key in keyof (typeof sitePalette)["light"]]: string;
}): string {
  return Object.entries(palette)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n");
}

/** Generate the site color tokens while retaining the existing system-theme behavior. */
export function generateSitePaletteCss(): string {
  return `:root {\n${declarations(sitePalette.light)}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(sitePalette.dark)}\n  }\n}`;
}

/** Light site colors mapped to Pele's standalone SVG token names for feeds. */
export const feedSitePalette = {
  bg: sitePalette.light.bg,
  fg: sitePalette.light.text,
  muted: sitePalette.light["text-2"],
  line: sitePalette.light["text-2"],
  surface: sitePalette.light["bg-subtle"],
  "surface-alt": sitePalette.light["accent-subtle"],
  border: sitePalette.light.border,
  accent: sitePalette.light.accent,
} as const;
