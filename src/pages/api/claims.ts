/**
 * POST /api/claims: stores a "Claim your business" request as a private `claimRequest` document in
 * Sanity. The document ID has a dot (`claims.<uuid>`), which keeps it out of public reads, because it
 * holds an email address. The write token only ever exists on the server.
 */
import type { APIRoute } from 'astro';
import { getSanityWriteClient } from '~/lib/sanity/writeClient';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

// Best-effort limit per server instance: 5 requests per address per hour.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
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

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  // Same-origin only.
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== url.host) return json(403, { ok: false });
    } catch {
      return json(403, { ok: false });
    }
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 10_000) return json(413, { ok: false });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false });
  }

  // Honeypot: pretend it worked so a bot learns nothing.
  if (clean(body.website, 200)) return json(200, { ok: true });

  const businessName = clean(body.businessName, 120);
  const town = clean(body.town, 80);
  const role = clean(body.role, 60);
  const email = clean(body.email, 120);
  const ownershipNote = typeof body.ownershipNote === 'string' ? body.ownershipNote.trim().slice(0, 1000) : '';
  const confirmed = body.confirmed === true;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!businessName || !town || !role || !emailOk || !confirmed) return json(400, { ok: false });

  if (limited(clientAddress ?? 'unknown', Date.now())) return json(429, { ok: false });

  try {
    await getSanityWriteClient().create({
      _id: `claims.${crypto.randomUUID()}`,
      _type: 'claimRequest',
      status: 'new',
      businessName,
      town,
      role,
      email,
      ownershipNote,
      confirmed,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Could not save claim request:', error instanceof Error ? error.message : error);
    return json(500, { ok: false });
  }
  return json(200, { ok: true });
};
