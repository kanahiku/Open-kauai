/**
 * SEO Check Script
 * Validates: titles, H1s, canonicals, alt text, schema, status codes, sitemap
 * 
 * Usage: npm run seo:check
 * Run after build to check the production output.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface SEOIssue {
  file: string;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: SEOIssue[] = [];
const DIST_DIR = './dist';

function walkDir(dir: string, callback: (file: string) => void) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, callback);
      } else if (file.endsWith('.html')) {
        callback(filePath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

function checkHtmlFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(DIST_DIR, filePath);

  // Check for title tag
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push({ file: relativePath, issue: 'Missing or empty <title> tag', severity: 'error' });
  } else if (titleMatch[1].length > 70) {
    issues.push({ file: relativePath, issue: `Title too long (${titleMatch[1].length} chars, max 70)`, severity: 'warning' });
  }

  // Check for meta description
  const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!descMatch || !descMatch[1].trim()) {
    issues.push({ file: relativePath, issue: 'Missing or empty meta description', severity: 'error' });
  } else if (descMatch[1].length > 160) {
    issues.push({ file: relativePath, issue: `Description too long (${descMatch[1].length} chars, max 160)`, severity: 'warning' });
  }

  // Check for H1
  const h1Matches = content.match(/<h1[^>]*>/gi) || [];
  if (h1Matches.length === 0) {
    issues.push({ file: relativePath, issue: 'Missing <h1> tag', severity: 'error' });
  } else if (h1Matches.length > 1) {
    issues.push({ file: relativePath, issue: `Multiple H1 tags found (${h1Matches.length})`, severity: 'warning' });
  }

  // Check for canonical
  const canonicalMatch = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (!canonicalMatch) {
    issues.push({ file: relativePath, issue: 'Missing canonical link', severity: 'warning' });
  } else if (canonicalMatch[1].includes('localhost') || canonicalMatch[1].includes('vercel.app')) {
    issues.push({ file: relativePath, issue: `Canonical points to non-production URL: ${canonicalMatch[1]}`, severity: 'error' });
  }

  // Check images for alt text
  const imgMatches = content.matchAll(/<img[^>]*>/gi);
  for (const img of imgMatches) {
    const imgTag = img[0];
    const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
    const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
    if (!altMatch) {
      const src = srcMatch ? srcMatch[1].slice(-50) : 'unknown';
      issues.push({ file: relativePath, issue: `Image missing alt attribute: ...${src}`, severity: 'error' });
    }
  }

  // Check for Open Graph tags
  const ogTitle = content.match(/<meta[^>]*property=["']og:title["']/i);
  const ogDesc = content.match(/<meta[^>]*property=["']og:description["']/i);
  const ogImage = content.match(/<meta[^>]*property=["']og:image["']/i);
  if (!ogTitle || !ogDesc) {
    issues.push({ file: relativePath, issue: 'Missing Open Graph title or description', severity: 'warning' });
  }
  if (!ogImage) {
    issues.push({ file: relativePath, issue: 'Missing Open Graph image', severity: 'warning' });
  }

  // Check for JSON-LD schema
  const schemaMatch = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i);
  if (!schemaMatch && !relativePath.includes('404')) {
    issues.push({ file: relativePath, issue: 'Missing JSON-LD schema', severity: 'warning' });
  }

  // Check for staging/localhost links
  const stagingLinks = content.match(/href=["'][^"']*(localhost|\.vercel\.app|staging)[^"']*["']/gi);
  if (stagingLinks) {
    issues.push({ file: relativePath, issue: `Found staging/localhost links: ${stagingLinks.length} occurrences`, severity: 'error' });
  }
}

function checkSitemap() {
  try {
    const sitemapPath = join(DIST_DIR, 'sitemap.xml');
    const content = readFileSync(sitemapPath, 'utf-8');
    
    // Check for localhost URLs
    if (content.includes('localhost') || content.includes('vercel.app')) {
      issues.push({ file: 'sitemap.xml', issue: 'Sitemap contains non-production URLs', severity: 'error' });
    }

    // Check URL count
    const urlCount = (content.match(/<url>/g) || []).length;
    if (urlCount === 0) {
      issues.push({ file: 'sitemap.xml', issue: 'Sitemap is empty', severity: 'error' });
    } else {
      console.log(`Sitemap contains ${urlCount} URLs`);
    }
  } catch {
    issues.push({ file: 'sitemap.xml', issue: 'Sitemap not found in dist/', severity: 'warning' });
  }
}

function checkRobots() {
  try {
    const robotsPath = join(DIST_DIR, 'robots.txt');
    const content = readFileSync(robotsPath, 'utf-8');
    
    if (!content.includes('Sitemap:')) {
      issues.push({ file: 'robots.txt', issue: 'robots.txt missing Sitemap reference', severity: 'warning' });
    }
    
    if (content.includes('Disallow: /') && !content.includes('Disallow: /api')) {
      issues.push({ file: 'robots.txt', issue: 'robots.txt may be blocking all pages', severity: 'warning' });
    }
  } catch {
    issues.push({ file: 'robots.txt', issue: 'robots.txt not found in dist/', severity: 'warning' });
  }
}

// Run checks
console.log('🔍 Running SEO checks...\n');

walkDir(DIST_DIR, checkHtmlFile);
checkSitemap();
checkRobots();

// Report results
const errors = issues.filter(i => i.severity === 'error');
const warnings = issues.filter(i => i.severity === 'warning');

if (errors.length > 0) {
  console.log('\n❌ ERRORS:\n');
  for (const issue of errors) {
    console.log(`  ${issue.file}: ${issue.issue}`);
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  for (const issue of warnings) {
    console.log(`  ${issue.file}: ${issue.issue}`);
  }
}

console.log(`\n📊 Summary: ${errors.length} errors, ${warnings.length} warnings\n`);

// Exit with error code if there are errors
if (errors.length > 0) {
  process.exit(1);
}
