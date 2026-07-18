import type { MermaidPluginOptions } from "@xingwangzhe/satteri-mermaid";

export const mermaidOptions: MermaidPluginOptions = {
  responsive: false,
  theme: "editor-light",
  themeOverrides: {
    canvas: "var(--bg)",
    surface: "var(--bg-subtle)",
    surface_alt: "var(--bg-subtle)",
    surface_muted: "var(--bg-subtle)",
    text: "var(--text)",
    subtle_text: "var(--text-2)",
    border: "var(--border)",
    line: "var(--text-2)",
    edge_label_background: "var(--bg)",
    cluster_background: "var(--bg-subtle)",
    cluster_border: "var(--border)",
    note_background: "var(--accent-subtle)",
    note_border: "var(--accent)",
    note_text: "var(--text)",
    actor_background: "var(--bg-subtle)",
    actor_border: "var(--border)",
    actor_text: "var(--text)",
    activation_background: "var(--bg)",
    activation_border: "var(--border)",
    error: "var(--accent)",
    warning: "var(--accent)",
    success: "var(--accent)",
  },
};

const colorReplacements: Array<[string, string]> = [
  ["#ffffff", "var(--bg)"],
  ["#fff", "var(--bg)"],
  ["#f7f7f7", "var(--bg-subtle)"],
  ["#f4f4f4", "var(--bg-subtle)"],
  ["#f8fafc", "var(--bg-subtle)"],
  ["#f1f5f9", "var(--bg-subtle)"],
  ["#eaeaea", "var(--bg-subtle)"],
  ["#ececff", "var(--bg-subtle)"],
  ["#e8e8e8", "var(--border)"],
  ["#cbd5e1", "var(--border)"],
  ["#94a3b8", "var(--border)"],
  ["#666666", "var(--text-2)"],
  ["#666", "var(--text-2)"],
  ["#64748b", "var(--text-2)"],
  ["#111111", "var(--text)"],
  ["#0f172a", "var(--text)"],
  ["#000000", "var(--text)"],
  ["black", "var(--text)"],
  ["#444444", "var(--text-2)"],
  ["#333333", "var(--text-2)"],
  ["#333", "var(--text-2)"],
  ["#999", "var(--border)"],
  ["#e0c8db", "var(--accent-subtle)"],
  ["#edf2ae", "var(--accent-subtle)"],
  ["#fff5ad", "var(--accent-subtle)"],
  ["#7a3d6e", "var(--accent)"],
  ["#9370db", "var(--accent)"],
  ["#aaaa33", "var(--accent)"],
  ["#dc2626", "var(--accent)"],
];

export const mermaidSvgThemeStyles = `
  .actor,
  .labelBox,
  .node rect,
  .node polygon,
  .node circle,
  .cluster rect,
  .section,
  .task,
  .taskTextOutsideRight,
  .taskTextOutsideLeft {
    fill: var(--bg-subtle) !important;
    stroke: var(--border) !important;
  }

  .note {
    fill: var(--accent-subtle) !important;
    stroke: var(--accent) !important;
  }

  .actor-line,
  .messageLine0,
  .messageLine1,
  .loopLine,
  .edgePath .path,
  .flowchart-link,
  .marker,
  .marker path,
  [id$="-arrowhead"] path,
  [id$="-filled-head"] path,
  [id$="-crosshead"] path,
  [id$="-stickTopArrowHead"] path,
  [id$="-stickBottomArrowHead"] path,
  [id$="-solidTopArrowHead"] path,
  [id$="-solidBottomArrowHead"] path {
    stroke: var(--text-2) !important;
    fill: var(--text-2) !important;
  }

  .messageText,
  .labelText,
  .labelText tspan,
  .loopText,
  .loopText tspan,
  .noteText,
  .noteText tspan,
  .actor-box,
  .actor-box tspan,
  .sectionTitle,
  .sectionTitle tspan,
  text,
  tspan {
    fill: var(--text) !important;
    stroke: none !important;
  }

  .activation0,
  .activation1,
  .activation2,
  .sequenceNumber {
    fill: var(--bg) !important;
    stroke: var(--border) !important;
  }
`;

export function applyMermaidThemeVariables(svg: string): string {
  let themedSvg = svg;
  for (const [from, to] of colorReplacements) {
    themedSvg = themedSvg.replaceAll(from, to);
    themedSvg = themedSvg.replaceAll(from.toUpperCase(), to);
  }
  return themedSvg;
}
