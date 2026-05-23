declare module "virtual:site-feeds" {
  import type { AlternateFeed } from "./lib/feed.ts";
  export const feeds: AlternateFeed[];
}
