/**
 * The production origin, used for canonical links, Open Graph tags,
 * robots.txt, and the sitemap.
 *
 * Hard-coded rather than derived, so `metadataBase` resolves to the real domain
 * in every environment — including `npm run dev`, where there is no deployment
 * URL to read. Set NEXT_PUBLIC_SITE_URL to override it if a custom domain is
 * ever pointed at the site.
 */
const PRODUCTION_URL = "https://edwin.touchsimpledev.site";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL
).replace(/\/$/, "");
