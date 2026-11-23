/**
 * Places a point on the stylized island map. Latitude and longitude are mapped linearly across
 * Kauaʻi's extent into the island silhouette of a frame, so pins follow the real geography.
 *
 * Two frames come from the Figma file: the home page teaser and the full map view.
 */
interface Frame {
  width: number;
  height: number;
  /** Where the island silhouette sits inside the frame. */
  island: { x: number; y: number; width: number; height: number };
}

/** Home page "Made here" teaser (Figma 656 x 480). */
export const MAP_FRAME: Frame = {
  width: 656,
  height: 480,
  island: { x: 8, y: 8, width: 640.02, height: 464.014 },
};

/** Full map view (Figma 880 x 800). */
export const MAP_VIEW_FRAME: Frame = {
  width: 880,
  height: 800,
  island: { x: 20, y: 70, width: 810, height: 587.25 },
};

/** Kauaʻi's extent with a little padding. */
const BOUNDS = { minLat: 21.86, maxLat: 22.24, minLng: -159.8, maxLng: -159.29 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Centre of the point in frame pixels. Points outside the island are kept on its edge unless `clamped` is false. */
export function projectToFrame(
  lat: number,
  lng: number,
  frame: Frame = MAP_FRAME,
  clamped = true
): { x: number; y: number } {
  const { island } = frame;
  const rawX = (lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng);
  const rawY = (BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat);
  const fx = clamped ? clamp(rawX, 0, 1) : rawX;
  const fy = clamped ? clamp(rawY, 0, 1) : rawY;
  return { x: island.x + fx * island.width, y: island.y + fy * island.height };
}
