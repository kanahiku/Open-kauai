/**
 * Design assets for the three home sections (icons). These are UI artwork, not content:
 * the labels, titles and images for each section are edited in Sanity.
 */
import type { ImageMetadata } from 'astro';
import type { SectionKey } from '~/lib/sanity/queries';

import iconFork from '~/assets/icons/fork-knife.svg';
import iconBed from '~/assets/icons/bed.svg';
import iconMountains from '~/assets/icons/mountains.svg';
import iconShelfFork from '~/assets/icons/shelf-fork-knife.svg';
import iconShelfBed from '~/assets/icons/shelf-bed.svg';
import iconShelfMountains from '~/assets/icons/shelf-mountains.svg';

export const SECTION_ICONS: Record<SectionKey, { tab: ImageMetadata; shelf: ImageMetadata }> = {
  activities: { tab: iconMountains, shelf: iconShelfMountains },
  dining: { tab: iconFork, shelf: iconShelfFork },
  stay: { tab: iconBed, shelf: iconShelfBed },
};
