/**
 * OG card design: "Tag"
 *
 * A pill badge labels the collection at top-left. The title dominates the
 * center. An optional description sits below it. A thin rule + footer row
 * with the site name (in accent color) and date close out the card.
 *
 * To use, swap the import in astro.config.mjs:
 *   import { renderCollectionCard } from "./src/og/renderers/collection-card-tag.tsx"
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

const TITLE_LINE_HEIGHT = 1.04;
const TITLE_FONT_SIZE = 58;
const TITLE_MAX_LINES = 4;
const TITLE_MAX_HEIGHT = Math.round(
  TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
);

const SUMMARY_LINE_HEIGHT = 1.4;
const SUMMARY_FONT_SIZE = 22;
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
        backgroundColor: "#0D1117",
        padding: "48px 56px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Collection badge */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: accentColor + "22",
              border: `2px solid ${accentColor}55`,
              borderRadius: 9999,
              padding: "7px 22px",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 18,
                fontWeight: 600,
                color: accentColor,
              }}
            >
              {collectionLabel}
            </span>
          </div>
        </div>

        {/* Title + optional summary */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
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

          {summary && (
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: SUMMARY_FONT_SIZE,
                lineHeight: SUMMARY_LINE_HEIGHT,
                color: "#7A8494",
                maxHeight: SUMMARY_MAX_HEIGHT,
                overflow: "hidden",
              }}
            >
              {summary}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 21,
                fontWeight: 600,
                color: accentColor,
              }}
            >
              msfjarvis.dev
            </span>
            {formattedDate && (
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: 18,
                  color: "#4A5468",
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
