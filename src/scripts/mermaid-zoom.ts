import { enableZoom } from "pele/core";

document
  .querySelectorAll<HTMLElement>(".mermaid-diagram")
  .forEach((diagram) => {
    enableZoom(diagram, { always: true });
  });
