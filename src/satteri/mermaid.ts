import type { Code } from "mdast";
import { render } from "pele";
import { defineMdastPlugin } from "satteri";

let diagramIndex = 0;

export const mermaidDiagrams = defineMdastPlugin({
  name: "mermaid-diagrams",

  code(node: Code, context) {
    if (node.lang !== "mermaid") return;

    const { svg } = render(node.value, {
      idPrefix: `mermaid-${++diagramIndex}`,
      responsive: true,
    });

    const htmlSvg = svg.replace(' xmlns="http://www.w3.org/2000/svg"', "");
    context.replaceNode(node, {
      type: "html",
      value: `<div class="mermaid-diagram">${htmlSvg}</div>`,
    });
  },
});
