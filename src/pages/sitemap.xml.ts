import type { APIRoute } from 'astro';
import { canonicalSiteOrigin, isIndexableHost } from '~/lib/indexing';
import { getSanityClient } from '~/lib/sanity/client';
import { SECTION_KEYS } from '~/lib/sanity/queries';

export const prerender = false;

/** Fixed pages. Add each new route here as it ships. Business pages are added from Sanity. */
const STATIC_PATHS = [
  '/',
  '/map/',
  '/plan/',
  ...SECTION_KEYS.map((key) => `/${key}/`),
  '/about/',
  '/for-businesses/',
  '/region/',
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ url }) => {
  if (!isIndexableHost(url.host)) {
    return new Response('Not found', { status: 404 });
  }

  const { slugs, regions, stories } = await getSanityClient().fetch<{
    slugs: string[];
    regions: string[];
    stories: number;
  }>(`{
    "slugs": *[_type == "business" && listed != false && defined(slug.current)].slug.current,
    "regions": *[_type == "region" && defined(slug.current)].slug.current,
    "stories": count(*[_type == "ownerStory"])
  }`);
  const paths = [
    ...STATIC_PATHS,
    // The owners page is only worth indexing once it has stories.
    ...(stories > 0 ? ['/owners/'] : []),
    ...regions.map((slug) => `/region/${slug}/`),
    ...slugs.map((slug) => `/business/${slug}/`),
  ];

  const origin = canonicalSiteOrigin();
  const urls = paths.map((path) => `  <url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
