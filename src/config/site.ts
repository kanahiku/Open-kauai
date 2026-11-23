/**
 * Deployment settings: public URL, trailing-slash behaviour and analytics IDs.
 *
 * Site name, description, navigation, footer, contact details and all page copy live in Sanity
 * (see the `siteSettings` and `homePage` documents). Secrets (Sanity tokens) stay in env vars.
 */
export const site = {
  url: 'https://www.openkauai.org',
  trailingSlash: true,

  analytics: {
    /** Google Tag Manager container. Empty until the GTM container is created. */
    googleTagManagerId: '',
    /** Optional. Leave empty when tags are installed through GTM. */
    googleAnalyticsId: '',
    /** Search Console HTML-tag verification (content= value only). */
    googleSiteVerificationId: '',
  },
} as const;

export type SiteConfig = typeof site;

export function siteOrigin(): string {
  return site.url.replace(/\/$/, '');
}
