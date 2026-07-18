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
const TITLE_FONT_SIZE = 54;
const TITLE_MAX_LINES = 4;
const TITLE_MAX_HEIGHT = Math.round(TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES);
const SUMMARY_LINE_HEIGHT = 1.38;
const SUMMARY_FONT_SIZE = 23;
const SUMMARY_MAX_LINES = 3;
const SUMMARY_MAX_HEIGHT = Math.round(SUMMARY_FONT_SIZE * SUMMARY_LINE_HEIGHT * SUMMARY_MAX_LINES);

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
        position: "relative",
        backgroundColor: "#14171D",
        color: "#F0F1F3",
        padding: "26px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          borderRadius: "24px",
          border: "1px solid #3B4252",
          background: "linear-gradient(180deg, #1A1E26 0%, #171A21 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "14px",
            backgroundColor: accentColor,
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "54px 56px 48px 56px",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "JetBrains Mono",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#9DE0D6",
                }}
              >
                msfjarvis.dev
              </div>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Inter",
                  fontSize: "20px",
                  color: "#B7BFCC",
                }}
              >
                {formattedDate ?? ""}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontFamily: "JetBrains Mono",
                fontSize: `${TITLE_FONT_SIZE}px`,
                lineHeight: TITLE_LINE_HEIGHT,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                color: "#F0F1F3",
                maxHeight: `${TITLE_MAX_HEIGHT}px`,
                overflow: "hidden",
                paddingRight: "26px",
              }}
            >
              {title}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "1px",
                display: "flex",
                backgroundColor: "#3B4252",
              }}
            />

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "stretch",
                gap: "28px",
              }}
            >
              <div
                style={{
                  width: "82%",
                  minHeight: `${SUMMARY_MAX_HEIGHT}px`,
                  maxHeight: `${SUMMARY_MAX_HEIGHT}px`,
                  display: "flex",
                  fontFamily: "Inter",
                  fontSize: `${SUMMARY_FONT_SIZE}px`,
                  lineHeight: SUMMARY_LINE_HEIGHT,
                  color: summary ? "#C0C6D0" : "#8F96A3",
                  overflow: "hidden",
                }}
              >
                {summary}
              </div>

              <div
                style={{
                  width: "18%",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                  fontFamily: "JetBrains Mono",
                  fontSize: "19px",
                  color: "#8F96A3",
                  textTransform: "lowercase",
                }}
              >
                {collectionLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
