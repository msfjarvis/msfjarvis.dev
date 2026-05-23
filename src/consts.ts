export const SITE_TITLE = "msfjarvis.dev";
export const SITE_DESCRIPTION =
  "Systems Engineer at Cloudflare. Recovering Android developer, amateur Rustacean.";
export const SITE_URL = "https://msfjarvis.dev";
export const AUTHOR_NAME = "Harsh Shandilya";
export const AUTHOR_EMAIL = "me@msfjarvis.dev";

export const showDrafts = import.meta.env.DEV || import.meta.env.INCLUDE_DRAFTS === "true";

/** Weeknotes before this date were published under /posts/weeknotes-<id>/ */
export const WEEKNOTES_LEGACY_CUTOFF = new Date("2026-05-01");
