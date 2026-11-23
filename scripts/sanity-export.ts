/**
 * Sanity Export Script
 * Exports Sanity content with images to a backup file.
 * Optionally uploads to S3.
 *
 * Usage:
 *   npm run sanity:export           # Export to local file
 *   npm run sanity:export -- --s3   # Export and upload to S3
 *
 * Required env vars:
 *   SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN
 *
 * S3 env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION
 *   S3_SITE is optional. If set, it must match SITE_FOLDER below.
 *
 * When cloning, set SITE_FOLDER and SANITY_PROJECT_LOCK in this file.
 * The script refuses to run until both are set, refuses any other Sanity
 * project, and refuses to upload into any other site folder.
 *
 * S3 layout: s3://BUCKET/<site>/YYYY-MM-DD/sanity-export-<projectId>-<dataset>-....tar.gz
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

/** Site folder in the shared bucket. One name per site, for example "glzr". */
const SITE_FOLDER = '';
/** Sanity project this repo is allowed to export. */
const SANITY_PROJECT_LOCK = '';

const BACKUP_DIR = './backups';
const exportedAt = new Date();
const timestamp = exportedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dateFolder = exportedAt.toISOString().slice(0, 10);

const projectId = process.env.SANITY_PROJECT_ID?.trim() ?? '';
const dataset = (process.env.SANITY_DATASET || 'production').trim();
const token = process.env.SANITY_API_TOKEN?.trim() ?? '';
const uploadToS3 = process.argv.includes('--s3');

function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertSafeToken(value: string, label: string, pattern: RegExp) {
  if (!pattern.test(value)) refuse(`Refusing ${label} "${value}". It contains characters this backup will not accept.`);
}

if (!SITE_FOLDER || !SANITY_PROJECT_LOCK) {
  refuse(
    'Set SITE_FOLDER and SANITY_PROJECT_LOCK at the top of scripts/sanity-export.ts before exporting. Refusing to run so this site cannot write into another site folder.'
  );
}

assertSafeToken(SANITY_PROJECT_LOCK, 'locked project', /^[a-z0-9]+$/);
assertSafeToken(SITE_FOLDER, 'locked site folder', /^[a-z0-9]+(?:-[a-z0-9]+)*$/);

if (projectId !== SANITY_PROJECT_LOCK) {
  refuse(`Refusing Sanity project "${projectId}". Export is locked to ${SANITY_PROJECT_LOCK}.`);
}

if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(dataset)) {
  refuse(`Refusing dataset "${dataset}".`);
}

if (!token) {
  refuse('Missing required environment variable: SANITY_API_TOKEN');
}

const requestedSite = (process.env.S3_SITE || '').trim().toLowerCase();
if (requestedSite && requestedSite !== SITE_FOLDER) {
  refuse(`Refusing S3_SITE "${requestedSite}". This repo only uploads to ${SITE_FOLDER}/.`);
}

let s3Bucket = '';
let s3Region = 'us-east-1';
if (uploadToS3) {
  s3Bucket = (process.env.S3_BUCKET || '').trim();
  s3Region = (process.env.S3_REGION || 'us-east-1').trim();
  if (!s3Bucket) refuse('S3_BUCKET is required for S3 upload.');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(s3Bucket)) refuse(`Refusing S3 bucket "${s3Bucket}".`);
  if (!/^[a-z0-9-]+$/.test(s3Region)) refuse(`Refusing S3 region "${s3Region}".`);
}

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const filename = `sanity-export-${projectId}-${dataset}-${timestamp}.tar.gz`;
const filepath = join(BACKUP_DIR, filename);
const s3Key = `${SITE_FOLDER}/${dateFolder}/${filename}`;

console.log(`📦 Exporting Sanity project ${projectId}, dataset ${dataset}\n`);

try {
  execSync(`npx sanity dataset export ${dataset} ${filepath} --project ${projectId}`, {
    stdio: 'inherit',
    env: { ...process.env, SANITY_AUTH_TOKEN: token },
  });

  console.log(`\n✅ Export completed: ${filepath}\n`);

  if (uploadToS3) {
    console.log(`☁️  Uploading to S3: s3://${s3Bucket}/${s3Key}\n`);

    try {
      execSync(`aws s3 cp ${filepath} s3://${s3Bucket}/${s3Key} --region ${s3Region}`, { stdio: 'inherit' });
      console.log(`\n✅ Uploaded to S3 successfully\n`);

      if (process.argv.includes('--delete-local')) {
        unlinkSync(filepath);
        console.log(`🗑️  Local file deleted: ${filepath}\n`);
      }
    } catch {
      console.error(`\n❌ S3 upload failed. Local backup preserved at: ${filepath}`);
      process.exit(1);
    }
  }

  console.log('📁 Recent local backups:');
  execSync(`ls -lh ${BACKUP_DIR}/*.tar.gz 2>/dev/null | tail -5 || echo "  No backups found"`, {
    stdio: 'inherit',
  });
} catch (error) {
  console.error('\n❌ Export failed:', error);
  process.exit(1);
}
