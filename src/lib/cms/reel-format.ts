import { load } from "js-yaml";

/**
 * The `reel-mdx` custom format used by the games collection.
 *
 * The CMS edits a structured `frames` list, but the file on disk keeps Astro's
 * `ImageMetadata` style: each frame is an imported image referenced through a
 * JSX expression, so `Frame.astro` gets real width/height values without the
 * editor ever touching an import statement.
 */

export interface ReelFrame {
  src: string;
  alt: string;
  title: string;
  caption: string;
}

export interface ReelEntry {
  title: string;
  date: string;
  cover: string;
  subtitle?: string;
  frames: ReelFrame[];
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const IMPORT_PATTERN =
  /^import\s+([A-Za-z_$][\w$]*)\s+from\s+"([^"]+)";?\s*$/gm;
const FIELD_ORDER = ["title", "date", "cover", "subtitle"];

/** Games entries are always `src/content/games/<slug>/index.mdx`. */
const FRAME_IMPORT = 'import Frame from "../../../components/Frame.astro";';

/** Parse a reel MDX file into the flat object the CMS fields bind to. */
export function parseReelMdx(text: string): ReelEntry {
  const match = text.match(FRONTMATTER_PATTERN);
  const frontmatter = match?.[1] ?? "";
  const body = match?.[2] ?? text;
  const data = (load(frontmatter) ?? {}) as Record<string, unknown>;

  const imports = new Map<string, string>();
  for (const [, name, path] of body.matchAll(IMPORT_PATTERN)) {
    imports.set(name, path);
  }

  const frames = extractFrames(body).map((attributes) => {
    const parsed = parseAttributes(attributes);
    return {
      src: resolveSrc(parsed.image ?? "", imports),
      alt: resolveValue(parsed.alt ?? ""),
      title: resolveValue(parsed.title ?? ""),
      caption: resolveValue(parsed.caption ?? ""),
    };
  });

  const subtitle = asString(data.subtitle);
  return {
    title: asString(data.title),
    date: asString(data.date),
    cover: asString(data.cover),
    ...(subtitle ? { subtitle } : {}),
    frames,
  };
}

/** Serialize the flat CMS object back into MDX with imports and JSX frames. */
export function formatReelMdx(entry: ReelEntry): string {
  const { frames = [], ...front } = entry;

  const imports = new Map<string, string>();
  for (const frame of frames) {
    if (frame.src && !imports.has(frame.src)) {
      imports.set(frame.src, importName(frame.src, imports));
    }
  }

  const importBlock = [
    FRAME_IMPORT,
    ...[...imports].map(
      ([src, name]) => `import ${name} from ${JSON.stringify(src)};`,
    ),
  ].join("\n");

  const frameBlock = frames
    .map((frame, index) => {
      const name = imports.get(frame.src);
      const image = name ? `{${name}}` : JSON.stringify(frame.src);
      return [
        "<Frame",
        `  image=${image}`,
        `  title={${JSON.stringify(frame.title)}}`,
        `  caption={${JSON.stringify(frame.caption)}}`,
        `  alt={${JSON.stringify(frame.alt)}}`,
        ...(index === 0 ? ["  priority"] : []),
        "/>",
      ].join("\n");
    })
    .join("\n\n");

  const body = [importBlock, frameBlock].filter(Boolean).join("\n\n");
  return `---\n${serializeFrontmatter(front)}\n---\n\n${body}\n`;
}

function serializeFrontmatter(front: Record<string, unknown>): string {
  const keys = [
    ...FIELD_ORDER.filter((key) => front[key] !== undefined),
    ...Object.keys(front).filter(
      (key) => !FIELD_ORDER.includes(key) && front[key] !== undefined,
    ),
  ];
  return keys.map((key) => `${key}: ${yamlValue(front[key])}`).join("\n");
}

function yamlValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  return value === null || value === undefined ? "" : String(value);
}

/** Collect the raw attribute text of every `<Frame … />` in the body. */
function extractFrames(body: string): string[] {
  const frames: string[] = [];
  const opener = /<Frame\b/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(body)) !== null) {
    const start = match.index + match[0].length;
    const end = findSelfClosingEnd(body, start);
    if (end === -1) break;
    frames.push(body.slice(start, end));
    opener.lastIndex = end + 2;
  }

  return frames;
}

function findSelfClosingEnd(source: string, start: number): number {
  let inString = false;
  let escaped = false;
  let braces = 0;

  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") braces++;
    else if (char === "}") braces = Math.max(0, braces - 1);
    else if (char === "/" && source[i + 1] === ">") return i;
  }

  return -1;
}

/** Read `name=value` pairs, tolerating `{…}` expressions and quoted strings. */
function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let i = 0;

  while (i < source.length) {
    while (i < source.length && /\s/.test(source[i]!)) i++;

    const nameStart = i;
    while (i < source.length && /[\w$-]/.test(source[i]!)) i++;
    const name = source.slice(nameStart, i);
    if (!name) {
      i++;
      continue;
    }

    while (i < source.length && /\s/.test(source[i]!)) i++;
    if (source[i] !== "=") {
      attributes[name] = "";
      continue;
    }

    i++;
    while (i < source.length && /\s/.test(source[i]!)) i++;

    const char = source[i];
    if (char === "{") {
      const end = findBraceEnd(source, i);
      attributes[name] = source.slice(i + 1, end).trim();
      i = end + 1;
    } else if (char === '"' || char === "'") {
      const end = source.indexOf(char, i + 1);
      attributes[name] = source.slice(i + 1, end === -1 ? source.length : end);
      i = end === -1 ? source.length : end + 1;
    } else {
      const start = i;
      while (i < source.length && !/\s/.test(source[i]!)) i++;
      attributes[name] = source.slice(start, i);
    }
  }

  return attributes;
}

function findBraceEnd(source: string, start: number): number {
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return source.length;
}

function resolveSrc(image: string, imports: Map<string, string>): string {
  const value = image.trim();
  if (value.startsWith("{") || value.startsWith('"') || value.startsWith("'")) {
    return resolveValue(value);
  }
  return imports.get(value) ?? value;
}

/** Unwrap a `{…}` JSX expression down to its string value. */
function resolveValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function importName(src: string, imports: Map<string, string>): string {
  const base = src.split("/").pop() ?? "frame";
  let name = base.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_$]/g, "_");
  if (!/^[A-Za-z_$]/.test(name)) name = `_${name}`;

  const taken = new Set(imports.values());
  let candidate = name;
  let suffix = 2;
  while (taken.has(candidate)) candidate = `${name}_${suffix++}`;
  return candidate;
}
