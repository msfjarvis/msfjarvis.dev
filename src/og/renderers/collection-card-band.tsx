/**
 * OG card design: "Band"
 *
 * A solid accent-color header band spans the full width, carrying the site
 * name on the left and collection label on the right in dark ink. Below,
 * a dark field holds the title (large, top-aligned) and a summary + date
 * pair at the bottom.
 *
 * To use, swap the import in astro.config.mjs:
 *   import { renderCollectionCard } from "./src/og/renderers/collection-card-band.tsx"
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

const BAND_HEIGHT = 82;

const TITLE_LINE_HEIGHT = 1.04;
const TITLE_FONT_SIZE = 56;
const TITLE_MAX_LINES = 4;
const TITLE_MAX_HEIGHT = Math.round(
  TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
);

const SUMMARY_LINE_HEIGHT = 1.4;
const SUMMARY_FONT_SIZE = 22;
const SUMMARY_MAX_LINES = 2;
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
        flexDirection: "column",
        backgroundColor: "#0D1117",
      }}
    >
      {/* Accent header band */}
      <div
        style={{
          width: "100%",
          height: BAND_HEIGHT,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: accentColor,
          padding: "0 52px",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(0,0,0,0.6)",
          }}
        >
          msfjarvis.dev
        </span>
        <span
          style={{
            fontFamily: "Inter",
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(0,0,0,0.42)",
          }}
        >
          {collectionLabel}
        </span>
      </div>

      {/* Dark body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "42px 52px 44px",
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
            letterSpacing: "-0.035em",
            color: "#F0F1F3",
            maxHeight: TITLE_MAX_HEIGHT,
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        {/* Summary + date */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {summary && (
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: SUMMARY_FONT_SIZE,
                lineHeight: SUMMARY_LINE_HEIGHT,
                color: "#6E7A8A",
                maxHeight: SUMMARY_MAX_HEIGHT,
                overflow: "hidden",
              }}
            >
              {summary}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {formattedDate && (
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: 18,
                  color: "#3D4658",
                }}
              >
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
