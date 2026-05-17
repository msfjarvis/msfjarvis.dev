import { Resvg } from "@resvg/resvg-js";
import type { AstroIntegration } from "astro";
import { extract, sanitizeHtml } from "astro-opengraph-images/extract.js";
import { getFilePath } from "astro-opengraph-images/util.js";
import * as fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import satori from "satori";
import type {
  FilterFunction,
  IntegrationInput,
  IntegrationOptions,
  RenderFunctionInput,
} from "astro-opengraph-images";

type LocalIntegrationInput = IntegrationInput & {
  matchPathname?: (pathname: string) => boolean;
};

const defaults = {
  width: 1200,
  height: 630,
  verbose: false,
} satisfies Pick<IntegrationOptions, "width" | "height" | "verbose">;

export default function opengraphImages({
  options,
  render,
  filter,
  matchPathname,
}: LocalIntegrationInput): AstroIntegration {
  const optionsWithDefaults: IntegrationOptions = { ...defaults, ...options };

  return {
    name: "local-astro-opengraph-images",
    hooks: {
      "astro:build:done": async ({ logger, pages, dir }) => {
        logger.info("Generating Open Graph images");

        await Promise.all(
          pages.map(async (page) => {
            if (matchPathname && !matchPathname(page.pathname)) {
              if (optionsWithDefaults.verbose) {
                logger.info(`Skipping page ${page.pathname}.`);
              }
              return;
            }

            const htmlFile = await getFilePath({
              dir: fileURLToPath(dir),
              page: page.pathname,
            });
            const html = (await fs.readFile(htmlFile)).toString();
            const document = new JSDOM(sanitizeHtml(html)).window.document;
            const pageDetails = extract(document);
            const renderInput: RenderFunctionInput = { ...page, ...pageDetails, dir, document };

            if (filter) {
              const shouldRender = await (filter as FilterFunction)(renderInput);
              if (!shouldRender) {
                if (optionsWithDefaults.verbose) {
                  logger.info(`Skipping page ${page.pathname}.`);
                }
                return;
              }
            }

            const reactNode = await render(renderInput);
            const svg = await satori(reactNode, optionsWithDefaults);
            const resvg = new Resvg(svg, {
              font: { loadSystemFonts: false },
              fitTo: { mode: "width", value: optionsWithDefaults.width },
            });

            const pngFile = htmlFile.replace(/\.html$/, ".png");
            await fs.writeFile(pngFile, resvg.render().asPng());

            const relativePngFile = path
              .relative(fileURLToPath(dir), pngFile)
              .replaceAll("\\", "/");
            const imageUrl = decodeURIComponent(new URL(pageDetails.image).pathname.slice(1));
            if (imageUrl !== relativePngFile) {
              throw new Error(
                `The og:image property in ${htmlFile} (${imageUrl}) does not match the generated image (${relativePngFile}).`,
              );
            }

            if (optionsWithDefaults.verbose) {
              logger.info(`Generated ${relativePngFile} for ${htmlFile}.`);
            }
          }),
        );
      },
    },
  };
}
