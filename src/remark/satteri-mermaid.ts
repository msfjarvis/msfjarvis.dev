import { defineMdastPlugin } from "satteri";

import { renderMermaidDiagram } from "../lib/render-mermaid";

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function renderMermaidModal(svg: string, dialogLabel: string): string {
  return `<div data-mermaid-modal-root class="mermaid-modal"><figure class="mermaid-modal__figure"><div class="mermaid-modal__preview">${svg}</div><div class="mermaid-modal__actions"><button data-mermaid-modal-trigger type="button" class="mermaid-modal__open-button" aria-haspopup="dialog" aria-label="Open Mermaid diagram in lightbox">Expand diagram</button></div></figure><div data-mermaid-modal-container class="mermaid-modal__dialog" role="dialog" aria-modal="true" aria-label="${dialogLabel}" aria-hidden="true" inert><button type="button" class="mermaid-modal__overlay" data-mermaid-modal-overlay aria-label="Close Mermaid diagram lightbox" tabindex="-1"></button><div class="mermaid-modal__sheet" role="document"><button data-mermaid-modal-close type="button" class="mermaid-modal__close" aria-label="Close Mermaid diagram lightbox"><span aria-hidden="true">✕</span></button><div class="mermaid-modal__content">${svg}</div></div></div></div>`;
}

export default function satteriMermaid() {
  return defineMdastPlugin({
    name: "satteri-mermaid",
    async code(node) {
      if (node.lang !== "mermaid") return;
      const svg = await renderMermaidDiagram(node.value);
      const dialogLabel = escapeHtmlAttribute("Expanded Mermaid diagram");
      return {
        rawHtml: renderMermaidModal(svg, dialogLabel),
      };
    },
  });
}
