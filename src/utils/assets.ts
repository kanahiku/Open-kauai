import type { ImageMetadata } from 'astro';

/** Plain URL for an imported SVG or other static asset (for `<img src>`). */
export function assetUrl(asset: ImageMetadata | string): string {
  return typeof asset === 'string' ? asset : asset.src;
}
