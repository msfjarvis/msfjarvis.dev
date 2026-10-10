import type { ReactNode } from "react";
import type { SatoriOptions } from "satori";

export type OpenGraphDetails = {
  title: string;
  url: string;
  type: string;
  image: string;
  description?: string;
};

export type OpenGraphRenderInput = OpenGraphDetails & {
  pathname: string;
  dir: URL;
  document: Document;
};

export type OpenGraphRender = (
  input: OpenGraphRenderInput,
) => ReactNode | Promise<ReactNode>;

export type OpenGraphFilter = (
  input: OpenGraphRenderInput,
) => boolean | Promise<boolean>;

export type OpenGraphOptions = Partial<Pick<SatoriOptions, "fonts">> & {
  width: number;
  height: number;
  verbose?: boolean;
};

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
}

export function extractOpenGraphDetails(document: Document): OpenGraphDetails {
  const read = (name: string) =>
    document
      .querySelector(`meta[property="og:${name}"]`)
      ?.getAttribute("content")
      ?.trim();
  const title = read("title");
  const url = read("url");
  const type = read("type");
  const image = read("image");
  const missing = [
    ["og:title", title],
    ["og:url", url],
    ["og:type", type],
    ["og:image", image],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Open Graph metadata: ${missing.join(", ")}`,
    );
  }

  const description = read("description");
  return {
    title: title!,
    url: url!,
    type: type!,
    image: image!,
    ...(description && description !== title ? { description } : {}),
  };
}

export type LocalIntegrationInput = {
  options?: Partial<OpenGraphOptions>;
  render: OpenGraphRender;
  filter?: OpenGraphFilter;
  matchPathname?: (pathname: string) => boolean;
};
