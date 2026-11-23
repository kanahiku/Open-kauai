import { createClient, type SanityClient } from '@sanity/client';

// No fallback project. An unset env makes queries fail instead of reading another site's data.
// The client is created on first use, not at import, so a missing ID cannot crash the whole
// dev server or unrelated pages that happen to import this module.
const projectId = import.meta.env.SANITY_PROJECT_ID ?? '';
const dataset = import.meta.env.SANITY_DATASET || 'production';
const token = import.meta.env.SANITY_API_TOKEN || undefined;

let client: SanityClient | undefined;

export function getSanityClient(): SanityClient {
  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is not set. Copy it from .env.example into .env (see the Sanity section).');
  }
  client ??= createClient({
    projectId,
    dataset,
    apiVersion: '2026-09-15',
    useCdn: false,
    perspective: 'published',
    ...(token ? { token } : {}),
  });
  return client;
}
