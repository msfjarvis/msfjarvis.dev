/**
 * OG card design: "Split"
 *
 * A solid accent-color left panel (~38 % of width) carries the collection
 * label in very large, low-contrast type and the site domain at the bottom.
 * The dark right panel holds the title, an optional summary, and the date.
 *
 * To use, swap the import in astro.config.mjs:
 *   import { renderCollectionCard } from "./src/og/renderers/collection-card-split.tsx"
 */
import type { RenderFunctionInput } from "astro-opengraph-images";
import React, { type ReactNode } from "react";

import {
  formatOGDate,
  getAccentColor,
  getCollectionKindFromPath,
  getCollectionLabel,
  readCollection,
  readDate,
} from "../utils";

// Right panel dimensions (1200px total, ~38 % left panel)
const LEFT_PANEL_PERCENT = "38%";

const TITLE_LINE_HEIGHT = 1.06;
const TITLE_FONT_SIZE = 50;
const TITLE_MAX_LINES = 4;
const TITLE_MAX_HEIGHT = Math.round(
  TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
);

const SUMMARY_LINE_HEIGHT = 1.42;
const SUMMARY_FONT_SIZE = 20;
const SUMMARY_MAX_LINES = 3;
const SUMMARY_MAX_HEIGHT = Math.round(
  SUMMARY_FONT_SIZE * SUMMARY_LINE_HEIGHT * SUMMARY_MAX_LINES,
);

export async function renderCollectionCard({
  pathname,
  document,
  title,
  description,
}: RenderFunctionInput): Promise<ReactNode> {
  if (!title) {
    throw new Error(`Missing og:title for ${pathname}`);
  }

  const kind = readCollection(document) ?? getCollectionKindFromPath(pathname);
  const collectionLabel = kind ? getCollectionLabel(kind) : "";
  const accentColor = kind ? getAccentColor(kind) : "#A6B6FF";
  const rawDate = readDate(document);
  const formattedDate = rawDate ? formatOGDate(rawDate) : undefined;
  const summary = description?.trim();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      {/* ── Left accent panel ── */}
      <div
        style={{
          width: LEFT_PANEL_PERCENT,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: accentColor,
          padding: "52px 40px",
        }}
      >
        {/* Site domain – small, at top */}
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.07em",
            color: "rgba(0,0,0,0.45)",
          }}
        >
          msfjarvis.dev
        </span>

        {/* Collection label – oversized watermark text at bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "rgba(0,0,0,0.2)",
            }}
          >
            {collectionLabel}
          </span>
          {formattedDate && (
            <span
              style={{
                fontFamily: "Inter",
                fontSize: 17,
                color: "rgba(0,0,0,0.42)",
              }}
            >
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      {/* ── Right dark panel ── */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0D1117",
          padding: "52px 48px 48px",
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: TITLE_FONT_SIZE,
            fontWeight: 600,
            lineHeight: TITLE_LINE_HEIGHT,
            letterSpacing: "-0.03em",
            color: "#F0F1F3",
            maxHeight: TITLE_MAX_HEIGHT,
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        {/* Summary + separator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 1,
              display: "flex",
              backgroundColor: "#1E2430",
            }}
          />
          {summary && (
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: SUMMARY_FONT_SIZE,
                lineHeight: SUMMARY_LINE_HEIGHT,
                color: "#5B6780",
                maxHeight: SUMMARY_MAX_HEIGHT,
                overflow: "hidden",
              }}
            >
              {summary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
