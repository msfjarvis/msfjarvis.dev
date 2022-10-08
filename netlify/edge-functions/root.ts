import type { Context } from "https://edge.netlify.com";

const GITHUB_USERNAME = "msfjarvis";
const APS_SLUG = "Android-Password-Store";
const GITHUB_URL = `https://github.com`;
const MY_GITHUB = `${GITHUB_URL}/${GITHUB_USERNAME}`;
const APS_GITHUB_URL = `https://github.com/${APS_SLUG}/${APS_SLUG}`;

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const urlParts = url.pathname.split("/").filter(entry => entry != "");
  context.log(urlParts);
  switch (urlParts[0]) {
    case "g":
      switch (urlParts.length) {
        case 1:
          return redirect(MY_GITHUB);
        case 2:
          return redirect(`${MY_GITHUB}/${urlParts[1]}`);
        case 3:
          return redirect(`${MY_GITHUB}/${urlParts[1]}/commit/${urlParts[2]}`);
        case 4:
          return redirect(`${MY_GITHUB}/${urlParts[1]}/issues/${urlParts[3]}`);
      }
    case "aps":
      switch (urlParts.length) {
        case 1:
          return redirect(APS_GITHUB_URL);
        case 2:
          return redirect(`${APS_GITHUB_URL}/commit/${urlParts[1]}`);
        case 3:
          return redirect(`${APS_GITHUB_URL}/issues/${urlParts[2]}`);
      }
    case "apsg":
      switch (urlParts.length) {
        case 1:
          return redirect(`${GITHUB_URL}/${APS_SLUG}`);
        case 2:
          return redirect(`${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}`);
        case 3:
          return redirect(
            `${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}/commit/${urlParts[2]}`
          );
        case 4:
          return redirect(
            `${GITHUB_URL}/${APS_SLUG}/${urlParts[1]}/issues/${urlParts[3]}`
          );
      }
    default:
      return context.next();
  }
};

async function redirect(url: string): Promise<Response> {
  return Response.redirect(url, 301);
}
