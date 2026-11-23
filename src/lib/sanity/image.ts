import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { getSanityClient } from './client';

export interface ContentImage {
  src: string;
  alt: string;
}

let builder: ReturnType<typeof createImageUrlBuilder> | undefined;

export function urlFor(source: SanityImageSource) {
  builder ??= createImageUrlBuilder(getSanityClient());
  return builder.image(source);
}

export type SanityImageFields = {
  src?: string;
  alt?: string;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  hotspot?: { x: number; y: number; height?: number; width?: number } | null;
  asset?: { _ref?: string; _id?: string; url?: string; _type?: string } | null;
};

/**
 * Build a CDN URL that includes Studio crop (`rect`) and hotspot (`fp-x`/`fp-y`).
 * `asset->url` alone is the original file and ignores those edits.
 */
export function resolveContentImage(
  image?: SanityImageFields | null,
  size?: { width: number; height?: number }
): ContentImage | undefined {
  if (!image) return undefined;
  const alt = image.alt ?? '';

  if (image.asset?._ref || image.asset?._id || image.asset?.url) {
    try {
      let imageUrl = urlFor({
        asset: image.asset,
        crop: image.crop ?? undefined,
        hotspot: image.hotspot ?? undefined,
      });
      if (size) {
        imageUrl = imageUrl.width(size.width);
        if (size.height) imageUrl = imageUrl.height(size.height).fit('crop');
      }
      const src = imageUrl.auto('format').url();

      if (src) {
        const url = new URL(src);
        if (image.hotspot) {
          url.searchParams.set('fp-x', String(image.hotspot.x));
          url.searchParams.set('fp-y', String(image.hotspot.y));
        }
        return { src: url.toString(), alt };
      }
    } catch {
      // Fall through to the raw / fallback URL.
    }
  }

  if (image.src) return { src: image.src, alt };
  return undefined;
}

export function resolveContentImageOrEmpty(image?: SanityImageFields | null): ContentImage {
  return resolveContentImage(image) ?? { src: '', alt: image?.alt ?? '' };
}
