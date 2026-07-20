/**
 * The absolute origin used for canonical links, Open Graph tags, robots.txt,
 * and the sitemap.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this once a custom domain is pointed at the
 *      site. It always wins.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — injected into every Vercel deployment
 *      automatically, and always the project's *production* domain rather than
 *      the per-deployment preview URL. This is what stops a deployed build from
 *      shipping localhost in its metadata without anyone having to remember to
 *      configure anything.
 *   3. localhost, for `npm run dev`.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();
