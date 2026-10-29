export function cloneAstNode<T>(node: T): T {
  if (Array.isArray(node)) {
    // SAFETY: Each array item is recursively cloned without changing its shape.
    return node.map(cloneAstNode) as T;
  }

  if (node instanceof Object) {
    const entries = Object.entries(node).map(([key, value]) => [key, cloneAstNode(value)]);
    // SAFETY: The recursively cloned entries preserve the enumerable AST node fields and value types.

    return Object.fromEntries(entries) as T;
  }

  return node;
}
