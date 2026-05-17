export type CollectionKind = "posts" | "notes" | "weeknotes";

export function isCollectionKind(value: string | null | undefined): value is CollectionKind {
  return value === "posts" || value === "notes" || value === "weeknotes";
}

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

export function readMetaContent(document: Document, selector: string): string | undefined {
  const value = document.querySelector(selector)?.getAttribute("content");
  return value?.trim() || undefined;
}

export function readDate(document: Document): string | undefined {
  return (
    document.querySelector("[data-og-date]")?.getAttribute("data-og-date")?.trim() || undefined
  );
}

export function readCollection(document: Document): CollectionKind | undefined {
  const value = document
    .querySelector("[data-og-collection]")
    ?.getAttribute("data-og-collection")
    ?.trim();
  return isCollectionKind(value) ? value : undefined;
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
