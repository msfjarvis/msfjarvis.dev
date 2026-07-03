import { visit } from "unist-util-visit";

import { renderMermaidDiagram } from "../lib/render-mermaid";

import type { Root } from "mdast";
import type { VFile } from "vfile";

const mermaidModalStyles = `<style>
  .mermaid-modal {
    margin: 1.5rem 0;
  }

  .mermaid-modal__figure {
    margin: 0;
  }

  .mermaid-modal__preview {
    display: block;
    overflow-x: auto;
  }

  .mermaid-modal__preview svg {
    display: block;
    max-width: 100%;
    height: auto;
    margin-inline: auto;
  }

  .mermaid-modal__actions {
    display: flex;
    justify-content: center;
    margin-top: 0.75rem;
  }

  .mermaid-modal__open-button {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-subtle);
    color: var(--text);
    border-radius: 999px;
    padding: 0.45rem 0.8rem;
    font: inherit;
    cursor: pointer;
  }

  .mermaid-modal__open-button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .mermaid-modal__dialog {
    position: fixed;
    inset: 0;
    z-index: 40000;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 220ms ease, visibility 220ms ease;
  }

  .mermaid-modal__dialog[data-open='true'] {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .mermaid-modal__overlay {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgb(0 0 0 / 0.72);
    backdrop-filter: blur(10px);
    cursor: pointer;
  }

  .mermaid-modal__sheet {
    position: relative;
    width: min(100%, 1400px);
    max-height: calc(100vh - 3rem);
    display: grid;
    gap: 0.85rem;
    transform: translateY(1rem) scale(0.985);
    opacity: 0;
    transition: transform 260ms ease, opacity 260ms ease;
  }

  .mermaid-modal__dialog[data-open='true'] .mermaid-modal__sheet {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  .mermaid-modal__content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .mermaid-modal__content svg {
    display: block;
    width: min(100%, 1400px);
    max-width: 100%;
    max-height: calc(100vh - 8rem);
    height: auto;
    margin-inline: auto;
  }

  .mermaid-modal__close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, white 24%, transparent);
    border-radius: 999px;
    background: rgb(17 17 17 / 0.55);
    color: white;
    padding: 0.6rem;
    cursor: pointer;
    backdrop-filter: blur(12px);
  }

  .mermaid-modal__close:focus-visible,
  .mermaid-modal__open-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>`;

export default function remarkMermaid() {
  return async function transform(tree: Root, file: VFile) {
    const mermaidNodes: Array<{
      index: number;
      parent: NonNullable<typeof tree.children>[number];
    }> = [];

    visit(tree, "code", (node, index, parent) => {
      if (!parent || index == null || node.lang !== "mermaid") return;

      mermaidNodes.push({ index, parent });
    });

    for (const { index, parent } of mermaidNodes) {
      const svg = await renderMermaidDiagram(parent.children[index].value).catch((error) => {
        const location = file.path ?? file.history.at(0) ?? "unknown file";
        throw new Error(
          `Failed to render Mermaid diagram in ${location}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      const dialogLabel = `Expanded Mermaid diagram from ${file.basename ?? file.path ?? "document"}`;
      parent.children[index] = {
        type: "html",
        value: `${mermaidModalStyles}<div data-mermaid-modal-root class="mermaid-modal"><figure class="mermaid-modal__figure"><div class="mermaid-modal__preview">${svg}</div><div class="mermaid-modal__actions"><button data-mermaid-modal-trigger type="button" class="mermaid-modal__open-button" aria-haspopup="dialog" aria-label="Open Mermaid diagram in lightbox">Expand diagram</button></div></figure><div data-mermaid-modal-container class="mermaid-modal__dialog" role="dialog" aria-modal="true" aria-label="${dialogLabel}" aria-hidden="true" inert><button type="button" class="mermaid-modal__overlay" data-mermaid-modal-overlay aria-label="Close Mermaid diagram lightbox" tabindex="-1"></button><div class="mermaid-modal__sheet" role="document"><button data-mermaid-modal-close type="button" class="mermaid-modal__close" aria-label="Close Mermaid diagram lightbox"><span aria-hidden="true">✕</span></button><div class="mermaid-modal__content">${svg}</div></div></div></div><script>(function(){const current=document.currentScript?.previousElementSibling;if(!(current instanceof HTMLElement)||current.dataset.mermaidModalBound==='true')return;current.dataset.mermaidModalBound='true';const trigger=current.querySelector('[data-mermaid-modal-trigger]');const dialog=current.querySelector('[data-mermaid-modal-container]');const closeButton=current.querySelector('[data-mermaid-modal-close]');const overlay=current.querySelector('[data-mermaid-modal-overlay]');if(!(trigger instanceof HTMLButtonElement)||!(dialog instanceof HTMLElement)||!(closeButton instanceof HTMLButtonElement)||!(overlay instanceof HTMLButtonElement))return;let lastFocused=null;const lockScroll=()=>{document.body.style.overflow='hidden';};const unlockScroll=()=>{document.body.style.overflow='';};const open=()=>{lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:trigger;dialog.dataset.open='true';dialog.removeAttribute('inert');dialog.setAttribute('aria-hidden','false');lockScroll();closeButton.focus();};const close=()=>{dialog.dataset.open='false';dialog.setAttribute('inert','');dialog.setAttribute('aria-hidden','true');unlockScroll();lastFocused?.focus?.();};trigger.addEventListener('click',(event)=>{event.preventDefault();open();});closeButton.addEventListener('click',close);overlay.addEventListener('click',close);dialog.addEventListener('click',(event)=>{if(event.target===dialog)close();});dialog.addEventListener('keydown',(event)=>{if(event.key==='Escape'){event.preventDefault();close();}});})();</script>`,
      };
    }
  };
}
