export function cloneAstNode<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map(cloneAstNode) as T;
  }
  if (node !== null && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, cloneAstNode(value)]),
    ) as T;
  }
  return node;
}
