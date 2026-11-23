/**
 * Shared setup for scripts that write to Sanity.
 *
 * Safety lock: scripts refuse to run unless the project ID matches the Open Kauaʻi project,
 * so a wrong .env can never write into another client's dataset.
 */
import { createClient } from '@sanity/client';

export const OPEN_KAUAI_PROJECT_ID = 'i1q8kcrm';

export function loadEnv() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: rely on the real environment.
  }
}

export function getWriteClient() {
  loadEnv();
  const projectId = process.env.SANITY_PROJECT_ID ?? '';
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN;

  if (projectId !== OPEN_KAUAI_PROJECT_ID) {
    throw new Error(
      `Refusing to run: SANITY_PROJECT_ID is "${projectId}", expected "${OPEN_KAUAI_PROJECT_ID}" (Open Kauaʻi).`
    );
  }
  if (!token) throw new Error('Refusing to run: no SANITY_WRITE_TOKEN or SANITY_API_TOKEN in .env.');

  console.log(`Target: project ${projectId}, dataset ${dataset}`);
  return createClient({ projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false });
}
