export type CollectionKind = "posts" | "notes" | "weeknotes";

export function getCollectionKindFromPath(pathname: string): CollectionKind | null {
  if (pathname.startsWith("/posts/")) return "posts";

  if (pathname.startsWith("/notes/")) return "notes";

  if (pathname.startsWith("/weeknotes/")) return "weeknotes";

  return null;
}

export function getCollectionLabel(kind: CollectionKind): string {
  switch (kind) {
    case "posts":
      return "post";
    case "notes":
      return "note";
    case "weeknotes":
      return "weeknote";
  }
}

export function formatOGDate(input: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(input));
}

export function getAccentColor(kind: CollectionKind): string {
  switch (kind) {
    case "posts":
      return "#A6B6FF";
    case "notes":
      return "#9DE0D6";
    case "weeknotes":
      return "#CBA6F7";
  }
}
