import { Resvg } from "@resvg/resvg-js";
import type { AstroIntegration } from "astro";
import { extract, sanitizeHtml } from "astro-opengraph-images/extract.js";
import { getFilePath } from "astro-opengraph-images/util.js";
import * as fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

type Page = {
  pathname: string;
};

const defaults = {
  width: 1200,
  height: 630,
  verbose: false,
} satisfies Pick<IntegrationOptions, "width" | "height" | "verbose">;

export function getPagePathname(imagePathname: string): string | undefined {
  if (!imagePathname.endsWith("/index.png")) {
    return undefined;
  }

  return imagePathname.slice(0, -"index.png".length);
}

export default function opengraphImages({
  options,
  render,
  filter,
  matchPathname,
}: LocalIntegrationInput): AstroIntegration {
  const optionsWithDefaults: IntegrationOptions = { ...defaults, ...options };

  async function renderPng({
    page,
    html,
    dir,
  }: {
    page: Page;
    html: string;
    dir: URL;
  }) {
    const document = new JSDOM(sanitizeHtml(html)).window.document;
    const pageDetails = extract(document);
    const renderInput: RenderFunctionInput = {
      ...page,
      ...pageDetails,
      dir,
      document,
    };

    if (filter) {
      const shouldRender = await (filter as FilterFunction)(renderInput);
      if (!shouldRender) {
        return undefined;
      }
    }

    const reactNode = await render(renderInput);
    const svg = await satori(reactNode, optionsWithDefaults);
    const resvg = new Resvg(svg, {
      font: { loadSystemFonts: false },
      fitTo: { mode: "width", value: optionsWithDefaults.width },
    });

    return { png: resvg.render().asPng(), pageDetails };
  }

  return {
    name: "local-astro-opengraph-images",
    hooks: {
      "astro:config:setup": ({ command, logger, updateConfig }) => {
        if (command !== "dev") {
          return;
        }

        updateConfig({
          vite: {
            plugins: [
              {
                name: "local-astro-opengraph-images:dev",
                enforce: "pre",
                configureServer(server) {
                  server.middlewares.use(async (req, res, next) => {
                    if (req.method !== "GET" && req.method !== "HEAD") {
                      next();
                      return;
                    }

                    const origin = `http://${req.headers.host ?? "localhost"}`;
                    const imageUrl = new URL(req.url ?? "/", origin);
                    const devServerUrl =
                      server.resolvedUrls?.local[0] ?? imageUrl.origin;
                    const pageUrlPathname = getPagePathname(imageUrl.pathname);
                    if (!pageUrlPathname) {
                      next();
                      return;
                    }

                    const pathname = pageUrlPathname.slice(1);
                    if (matchPathname && !matchPathname(pathname)) {
                      next();
                      return;
                    }

                    try {
                      const pageResponse = await fetch(
                        new URL(pageUrlPathname, devServerUrl),
                      );
                      if (!pageResponse.ok) {
                        next();
                        return;
                      }

                      const rendered = await renderPng({
                        page: { pathname },
                        html: await pageResponse.text(),
                        dir: pathToFileURL(`${server.config.root}${path.sep}`),
                      });
                      if (!rendered) {
                        next();
                        return;
                      }

                      res.writeHead(200, {
                        "Cache-Control": "no-store",
                        "Content-Type": "image/png",
                      });
                      res.end(req.method === "HEAD" ? undefined : rendered.png);
                    } catch (error) {
                      logger.error(
                        `Failed to render the Open Graph image for ${pathname}: ${error instanceof Error ? error.message : String(error)}`,
                      );
                      next(error);
                    }
                  });
                },
              },
            ],
          },
        });
      },
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
            const rendered = await renderPng({
              page,
              html: await fs.readFile(htmlFile, "utf8"),
              dir,
            });
            if (!rendered) {
              if (optionsWithDefaults.verbose) {
                logger.info(`Skipping page ${page.pathname}.`);
              }
              return;
            }

            const pngFile = htmlFile.replace(/\.html$/, ".png");
            await fs.writeFile(pngFile, rendered.png);

            const relativePngFile = path
              .relative(fileURLToPath(dir), pngFile)
              .replaceAll("\\", "/");
            const imageUrl = decodeURIComponent(
              new URL(rendered.pageDetails.image).pathname.slice(1),
            );
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
