/**
 * Brand tokens — the only file to edit when setting up a new client.
 *
 * Fill values extracted from Figma:
 * 1. Find Variables, Design System frame, or walk representative screens
 * 2. Extract colors (fills), typography (font, size, weight), radius
 * 3. Paste values here — components use Tailwind tokens backed by CSS vars
 *
 * Do not put contact data, GTM, nav links, or page copy here.
 * Those live in src/config/site.ts, src/config/contact.ts, and siblings.
 */

export const brand = {
  fonts: {
    heading: {
      name: 'Inter', // TODO: From Figma
      cssVariable: '--font-heading',
      provider: 'google' as const,
      weights: ['400', '500', '600', '700'] as string[],
      styles: ['normal'] as string[],
      subsets: ['latin'] as string[],
      fallbacks: ['sans-serif'] as string[],
    },
    body: {
      name: 'Inter', // TODO: From Figma
      cssVariable: '--font-body',
      provider: 'google' as const,
      weights: ['400', '500', '600', '700'] as string[],
      styles: ['normal', 'italic'] as string[],
      subsets: ['latin'] as string[],
      fallbacks: ['sans-serif'] as string[],
    },
  },
  colors: {
    accent: '#3B82F6',
    accentHover: '#2563EB',
    heading: '#111827',
    muted: '#6B7280',
    eyebrow: '#6B7280',
    page: '#FFFFFF',
    banner: '#F3F4F6',
    bannerLine: '#E5E7EB',
    bannerText: '#374151',
    bannerDot: '#9CA3AF',
    bannerNote: '#6B7280',
    navCta: '#3B82F6',
    sectionGrey: '#F9FAFB',
    sectionDark: '#111827',
    card: '#FFFFFF',
    cardMist: '#E5E7EB',
    cardDark: '#1F2937',
    ctaBg: '#3B82F6',
    ctaEnd: '#2563EB',
    ctaTan: '#3B82F6',
    tanText: '#2563EB',
    tanBody: '#111827',
    featureCard: '#FFFFFF',
    primary: '#3B82F6',
    secondary: '#6B7280',
    navy: '#111827',
    white: '#FFFFFF',
    cream: '#FAFAFA',
    nav: '#6B7280',
    black: '#111827',
    footerBg: '#111827',
  },
  type: {
    h1: { size: '60px', mobile: '36px', lineHeight: '1.1', tracking: '-0.02em' },
    h2: { size: '48px', mobile: '28px', lineHeight: '1.1', tracking: '-0.01em' },
    h3: { size: '32px', mobile: '24px', lineHeight: '1.2', tracking: '0' },
    h4: { size: '24px', mobile: '20px', lineHeight: '1.3', tracking: '0' },
    body: { size: '16px', mobile: '16px', lineHeight: '1.6', tracking: '0' },
    bodyLg: { size: '18px', mobile: '16px', lineHeight: '1.6', tracking: '0' },
    button: { size: '14px', mobile: '14px', lineHeight: '1', tracking: '0.05em' },
    eyebrow: { size: '14px', mobile: '12px', lineHeight: '1', tracking: '0.1em' },
    small: { size: '14px', mobile: '14px', lineHeight: '1.5', tracking: '0' },
    caption: { size: '12px', mobile: '12px', lineHeight: '1.4', tracking: '0' },
    label: { size: '16px', mobile: '14px', lineHeight: '1', tracking: '0.05em' },
    ticker: { size: '24px', mobile: '18px', lineHeight: '1', tracking: '0' },
    quote: { size: '20px', mobile: '18px', lineHeight: '1.4', tracking: '0' },
  },
  radius: {
    base: '8px',
    lg: '12px',
    xl: '16px',
    hero: '0px',
    full: '9999px',
  },
  motif: {
    heroOpacity: 0,
    darkOpacity: 0,
    greyOpacity: 0,
    whiteOpacity: 0,
    ctaOpacity: 0,
    pageOpacity: 0,
    ctaColor: '#000000',
  },
} as const;

export type Brand = typeof brand;
