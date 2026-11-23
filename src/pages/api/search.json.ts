/**
 * GET /api/search.json?q=kayak: the few best places and businesses for the suggestions under the
 * search box. Labels and lines come from the `searchPage` document and the listings.
 */
import type { APIRoute } from 'astro';
import { businessLine, getSearchIndex, loadSearchCopy, placeLine, search } from '~/lib/search';
import { fillTemplate } from '~/lib/business-page';
import { SECTION_ICONS } from '~/lib/sections';
import { assetUrl } from '~/utils/assets';
import mapPin from '~/assets/icons/map-pin.svg';
import type { SectionKey } from '~/lib/sanity/queries';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };

  try {
    const [index, copy] = await Promise.all([getSearchIndex(), loadSearchCopy()]);
    const results = search(index, q, new Date(), 5);

    const body = {
      query: q,
      total: results.total,
      groups: [
        {
          title: copy.placesTitle ?? '',
          icon: assetUrl(mapPin),
          items: results.places.slice(0, 3).map((place) => ({
            label: place.title,
            line: placeLine(place, copy),
            href: place.href,
          })),
        },
        {
          title: copy.businessesTitle ?? '',
          items: results.businesses.map(({ business, card }) => ({
            label: card.name,
            line: businessLine(business),
            href: card.href,
            icon: SECTION_ICONS[business.section as SectionKey]
              ? assetUrl(SECTION_ICONS[business.section as SectionKey].shelf)
              : assetUrl(mapPin),
          })),
        },
      ].filter((group) => group.items.length > 0),
      all: {
        label: copy.showAllLabel ? fillTemplate(copy.showAllLabel, { query: q }) : '',
        href: `/search/?q=${encodeURIComponent(q)}`,
      },
    };
    return new Response(JSON.stringify(body), { headers });
  } catch (error) {
    console.error('Search failed:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ query: q, total: 0, groups: [], all: { label: '', href: '' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
};
