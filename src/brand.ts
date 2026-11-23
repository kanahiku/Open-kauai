/**
 * Brand tokens — the only file to edit when the Open Kauaʻi design changes.
 *
 * Source: Figma file GeUusPT6zwjnBJ2Z900G7R (Open Kauaʻi), brand page + home frame.
 *
 * Flow:
 * 1. Edit the values below.
 * 2. `CustomStyles.astro` injects `brandStylesheet()` as `--aw-color-*` vars.
 * 3. `src/assets/styles/tailwind.css` maps those vars to Tailwind tokens
 *    (`bg-teal`, `text-ink`, `rounded-card`, `font-serif`, ...).
 *
 * Components never hardcode hex. Contact data, nav and copy live in `src/config/*`
 * and `src/data/*`.
 */

export const brand = {
  fonts: {
    /** Gentium Plus — headings, display, body copy. */
    serif: {
      name: 'Gentium Plus',
      cssVariable: '--font-gentium-plus',
      provider: 'google' as const,
      weights: ['400', '700'] as string[],
      styles: ['normal', 'italic'] as string[],
      subsets: ['latin'] as string[],
      fallbacks: ['serif'] as string[],
    },
    /** Open Sans — navigation, buttons, chips, meta. */
    sans: {
      name: 'Open Sans',
      cssVariable: '--font-open-sans',
      provider: 'google' as const,
      weights: ['400', '600'] as string[],
      styles: ['normal'] as string[],
      subsets: ['latin'] as string[],
      fallbacks: ['sans-serif'] as string[],
    },
  },

  colors: {
    /** Primary action + links. */
    teal: '#00688c',
    tealDeep: '#004e69',
    tealWash: '#e2eff3',
    /** Tints behind headings on teal sections. */
    sea: '#eaf3f6',
    /** Accent for outlines and focus. */
    sky: '#3e8fcb',
    /** "Locally owned" leaf and open-status text. */
    leaf: '#1f5c3d',
    /** Eyebrow labels and "Known for" captions. */
    sand: '#c8ac85',
    sandWash: '#f6f0e6',
    ink: '#1c2a2f',
    muted: '#56676d',
    line: '#d8e1e3',
    tint: '#f3f6f5',
    white: '#ffffff',
    /** Scrim over hero photos. Used with opacity modifiers. */
    scrim: '#001f2e',
  },

  radius: {
    sm: '8px',
    md: '14px',
    /** Category tiles. */
    lg: '22px',
    /** Listing cards. */
    card: '20px',
    xl: '32px',
    pill: '9999px',
  },
} as const;

export type Brand = typeof brand;

/** Astro Fonts API entries — used by astro.config.ts and Layout.astro. */
export function brandFontConfig() {
  return [brand.fonts.serif, brand.fonts.sans].map((font) => ({
    name: font.name,
    cssVariable: font.cssVariable,
    provider: font.provider,
    weights: font.weights,
    styles: font.styles,
    subsets: font.subsets,
    fallbacks: font.fallbacks,
    preload: true,
  }));
}

/** Full stylesheet injected by CustomStyles.astro. Feeds the Tailwind theme. */
export function brandStylesheet(b: Brand = brand): string {
  const colorVars = Object.entries(b.colors)
    .map(([name, hex]) => `  --aw-color-${kebab(name)}: ${hex};`)
    .join('\n');
  const radiusVars = Object.entries(b.radius)
    .map(([name, value]) => `  --aw-radius-${kebab(name)}: ${value};`)
    .join('\n');

  return `:root {\n${colorVars}\n${radiusVars}\n}`;
}

function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
