/**
 * GET /api/plan: builds a day from the choices on the Plan with AI page and returns it as JSON for
 * the page to show. Choices are checked against the `planPage` document; stops are real listings.
 */
import type { APIRoute } from 'astro';
import { buildPlan, parseRequest } from '~/lib/plan';
import { loadPlanCopy, loadPlanRegions } from '~/lib/plan-page';
import { getSiteSettings } from '~/lib/site';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// Best-effort limit per server instance: each plan can cost an AI request.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function limited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

/** The choices come in the query string (GET), so the request has no body to be redirected. */
function fromQuery(params: URLSearchParams): Record<string, unknown> {
  return {
    region: params.get('region') ?? '',
    day: params.get('day') ?? '',
    time: params.get('time') ?? '',
    budget: params.get('budget') ?? '',
    interests: params.getAll('interests'),
    note: params.get('note') ?? '',
  };
}

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  // Same-origin only.
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== url.host) return json(403, { ok: false });
    } catch {
      return json(403, { ok: false });
    }
  }

  if (url.search.length > 2_000) return json(414, { ok: false });
  const body = fromQuery(url.searchParams);

  try {
    const [copy, regions, settings] = await Promise.all([loadPlanCopy(), loadPlanRegions(), getSiteSettings()]);
    const parsed = parseRequest(body, copy, regions);
    if (!parsed) return json(400, { ok: false });

    if (limited(clientAddress ?? 'unknown', Date.now())) return json(429, { ok: false });

    const result = await buildPlan(parsed, copy, regions, settings.listingLabels ?? {});
    return json(200, { ok: true, result });
  } catch (error) {
    console.error('Could not build a plan:', error instanceof Error ? error.message : error);
    return json(500, { ok: false });
  }
};
