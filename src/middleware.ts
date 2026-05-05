import { defineMiddleware } from "astro:middleware";

const GITHUB_USERNAME = "msfjarvis";
const APS_SLUG = "Android-Password-Store";
const GITHUB_URL = `https://github.com`;
const MY_GITHUB = `${GITHUB_URL}/${GITHUB_USERNAME}`;
const APS_GITHUB_URL = `https://github.com/${APS_SLUG}/${APS_SLUG}`;

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const urlParts = url.pathname.split("/").filter((entry) => entry !== "");

  if (urlParts.length === 0) {
    return next();
  }

  let redirectUrl: string | null = null;

  switch (urlParts[0]) {
    case "g":
      switch (urlParts.length) {
        case 1:
          redirectUrl = MY_GITHUB;
          break;
        case 2:
          redirectUrl = `${MY_GITHUB}/${urlParts[1]}`;
          break;
        case 3:
          redirectUrl = `${MY_GITHUB}/${urlParts[1]}/commit/${urlParts[2]}`;
          break;
        case 4:
          redirectUrl = `${MY_GITHUB}/${urlParts[1]}/issues/${urlParts[3]}`;
          break;
      }
      break;
    case "aps":
      switch (urlParts.length) {
        case 1:
          redirectUrl = APS_GITHUB_URL;
          break;
        case 2:
          redirectUrl = `${APS_GITHUB_URL}/commit/${urlParts[1]}`;
          break;
        case 3:
          redirectUrl = `${APS_GITHUB_URL}/issues/${urlParts[2]}`;
          break;
      }
      break;
    case "apsg":
      switch (urlParts.length) {
        case 1:
          redirectUrl = `${GITHUB_URL}/${APS_SLUG}`;
          break;
        case 2:
          redirectUrl = `${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}`;
          break;
        case 3:
          redirectUrl = `${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}/commit/${urlParts[2]}`;
          break;
        case 4:
          redirectUrl = `${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}/issues/${urlParts[3]}`;
          break;
      }
      break;
  }

  if (redirectUrl) {
    return new Response(null, {
      status: 301,
      headers: { Location: redirectUrl },
    });
  }

  return next();
});
