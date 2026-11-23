import { createClient, type SanityClient } from '@sanity/client';

// No fallback project. Writes must never default to another site's dataset.
// Created on first use, like the read client, so importing this file cannot crash the server.
const projectId = import.meta.env.SANITY_PROJECT_ID ?? '';
const dataset = import.meta.env.SANITY_DATASET || 'production';
const token = import.meta.env.SANITY_WRITE_TOKEN || import.meta.env.SANITY_API_TOKEN || undefined;

let client: SanityClient | undefined;

export function getSanityWriteClient(): SanityClient {
  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is not set. Copy it from .env.example into .env (see the Sanity section).');
  }
  client ??= createClient({
    projectId,
    dataset,
    apiVersion: '2026-09-15',
    useCdn: false,
    ...(token ? { token } : {}),
  });
  return client;
}
