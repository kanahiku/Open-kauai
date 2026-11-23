/** Site-wide content (name, navigation, footer, contact, 404) from the `siteSettings` document. */
import { getSanityClient } from '~/lib/sanity/client';
import { SITE_SETTINGS_QUERY } from '~/lib/sanity/queries';

export interface NavLink {
  label: string;
  href: string;
}

/** Small labels shared by every listing card and breadcrumb. Empty values hide the label. */
export interface ListingLabels {
  ownedLabel?: string;
  franchiseLabel?: string;
  knownForLabel?: string;
  homeLabel?: string;
}

export interface SiteSettings {
  siteName: string;
  description: string;
  headerLinks?: NavLink[];
  headerAction?: Partial<NavLink>;
  /** "Ask AI" button: opens the Plan with AI page. */
  askAction?: Partial<NavLink>;
  menuLabel?: string;
  footerTagline?: string;
  officialInfo?: { label?: string; linkText?: string; url?: string };
  footerColumns?: { title: string; links?: NavLink[] }[];
  listingLabels?: ListingLabels;
  phone?: string;
  email?: string;
  areaServed?: string;
  socialLinks?: string[];
  notFoundTitle?: string;
  notFoundBody?: string;
  notFoundLinkLabel?: string;
}

async function fetchSettings(): Promise<SiteSettings> {
  const settings = await getSanityClient().fetch<SiteSettings | null>(SITE_SETTINGS_QUERY);
  if (!settings?.siteName) {
    throw new Error(
      'The "siteSettings" document is missing or has no site name. Create and publish it in the Studio, or run `npm run seed:site`.'
    );
  }
  return settings;
}

const TTL_MS = 60_000;
let cached: { at: number; value: Promise<SiteSettings> } | undefined;

/**
 * Cached briefly per server instance so one render does not repeat the fetch for the layout,
 * header and footer. The short TTL means Studio edits appear within a minute. Not cached in dev.
 */
export function getSiteSettings(): Promise<SiteSettings> {
  if (import.meta.env.DEV) return fetchSettings();
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    const value = fetchSettings();
    cached = { at: now, value };
    // A failed fetch must not be served from cache.
    value.catch(() => {
      if (cached?.value === value) cached = undefined;
    });
  }
  return cached.value;
}
