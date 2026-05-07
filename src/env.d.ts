/// <reference types="astro/client" />

declare module "virtual:site-feeds" {
  import type { AlternateFeed } from "./consts";
  export const feeds: AlternateFeed[];
}
