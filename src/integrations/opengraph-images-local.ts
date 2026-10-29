import type { CollectionKind } from "../og/utils.ts";
import { load } from "cheerio";
import type { ReactNode } from "react";
import type { SatoriOptions } from "satori";

export type OpenGraphDetails = {
  title: string;
  url: string;
  type: string;
  image: string;
  description?: string;
};

export type OpenGraphPageMetadata = OpenGraphDetails & {
  date?: string;
  collection?: CollectionKind;
};

export type OpenGraphRenderInput = OpenGraphPageMetadata & {
  pathname: string;
  dir: URL;
};

export type OpenGraphRender = (input: OpenGraphRenderInput) => ReactNode | Promise<ReactNode>;

export type OpenGraphFilter = (input: OpenGraphRenderInput) => boolean | Promise<boolean>;

export type OpenGraphOptions = Partial<Pick<SatoriOptions, "fonts">> & {
  width: number;
  height: number;
  verbose?: boolean;
};

export function parseOpenGraphPage(html: string): OpenGraphPageMetadata {
  const $ = load(html);
  const read = (name: string) => $(`meta[property="og:${name}"]`).first().attr("content")?.trim();
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
    throw new Error(`Missing required Open Graph metadata: ${missing.join(", ")}`);
  }

  const description = read("description");
  const date = $("[data-og-date]").first().attr("data-og-date")?.trim();
  const collection = $("[data-og-collection]").first().attr("data-og-collection")?.trim();
  return {
    title: title!,
    url: url!,
    type: type!,
    image: image!,
    ...(description && description !== title ? { description } : {}),
    ...(date ? { date } : {}),
    ...(collection === "posts" || collection === "notes" || collection === "weeknotes"
      ? { collection }
      : {}),
  };
}

export type LocalIntegrationInput = {
  options?: Partial<OpenGraphOptions>;
  render: OpenGraphRender;
  filter?: OpenGraphFilter;
  matchPathname?: (pathname: string) => boolean;
};
