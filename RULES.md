# Astro + Sanity Site Build Rules

This file contains ALL 67 rules for building Astro + Sanity sites.
Every AI agent MUST read and follow these rules.

## SECURITY (Rules 1-7)

### Rule 1: Cloudflare Protection
Put Cloudflare in front of every site: DNS, CDN, DDoS, Bot Fight Mode, WAF rules, rate limit on forms. SSL mode Full (strict).

### Rule 2: Cloudflare + Vercel Acknowledgment  
Vercel recommends against proxy setups. Team must acknowledge this config.

### Rule 3: Security Headers
Set in vercel.json: HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, CSP.

### Rule 4: Secrets Management
Secrets ONLY in Vercel env vars and 1Password. NEVER in Git, frontend code, or Sanity.

### Rule 5: Sanity CORS
Limit CORS to production domains only. Read token ONLY on server side.

### Rule 6: GitHub Security
2FA required, protect main branch, secret scanning on, Dependabot enabled, npm audit in CI.

### Rule 7: No Leftovers
Remove test endpoints, staging links, unused packages, console.log before production.

## CACHING (Rules 8-11)

### Rule 8: Static Asset Caching
/_astro/* files: 1 year immutable. Other public: 1 day-1 week. HTML: NOT cached.

### Rule 9: No Cloudflare HTML Cache
No Cache Everything on HTML unless purge-on-deploy configured.

### Rule 10: Sanity Webhook ISR
Sanity publish triggers webhook for ISR. Content updates without developer.

### Rule 11: Test Auto-Update
Before launch: Edit Sanity, publish, verify page updates within 60 seconds.

## IMAGES (Rules 12-15)

### Rule 12: Optimize Before Upload
Max 2000px wide, under 100KB, hero under 250KB. Add alt text.

### Rule 13: Astro Image
Use Astro Image for local, urlFor() with auto=format for Sanity. Responsive srcset.

### Rule 14: Dimensions + Lazy
Always set width/height. Lazy below fold. Hero never lazy.

### Rule 15: Self-Host Fonts
WOFF2 with font-display: swap.

## SSL (Rules 16-17)

### Rule 16: HTTPS Everywhere
HTTP redirects to HTTPS. HSTS on. No mixed content.

### Rule 17: No Extra Certs
No additional certs unless client needs them.

## BACKUPS (Rules 18-21)

### Rule 18: Release Tags
Tag every release: release/YYYY-MM-DD or v1.x.x. Tags over branches.

### Rule 19: Rollback Ready
Use Vercel Instant Rollback or redeploy from tag.

### Rule 20: Sanity Export
Export weekly via GitHub Actions. Before schema changes. On every release. Store in S3.

### Rule 21: Single Backup Location
All backups in ONE S3 bucket. Keep 4 weekly + 6 monthly.

## SEO (Rules 22-35)

### Rule 22: Shared SEO Components
Build SEO, Schema, GTM components ONCE. Do not rebuild per site.

### Rule 23: GTM Placement
GTM in base layout only. GSC via DNS TXT. Sitemap submitted after launch.

### Rule 24: Unique Meta
Unique title (50-60 chars) and description (120-160 chars) per page. Correct canonical.

### Rule 25: Fallback Strategy
Pick ONE: build fails on missing title OR code uses fallbacks. Not both.

### Rule 26: robots.txt
Generated in code. Staging noindex. Remove at launch.

### Rule 27: Sitemap Auto
Never hand-edited. Uses import.meta.glob + Sanity queries.

### Rule 28: SSR Sitemap with lastmod
Include _updatedAt for lastmod. Production URLs only. No noindex pages.

### Rule 29: Default Schema Types
Organization, WebSite, WebPage, Breadcrumb, BlogPosting, Service, LocalBusiness, FAQPage.

### Rule 30: Schema Override
Sanity SEO object has schemaOverride field for custom JSON-LD.

### Rule 31: SEO Panel in Sanity
Every doc: title, description, canonical, noIndex, ogImage fields.

### Rule 32: Site Settings
siteSettings doc has business info for LocalBusiness schema.

### Rule 33: Open Graph
og:title, og:description, og:image (1200x630), og:url, twitter:card on every page.

### Rule 34: Alt Text Required
imageWithAlt schema enforces alt. Blocks publish if missing.

### Rule 35: Heading Structure
One H1 per page. H2/H3 in order. No skipping levels.

## MONITORING (Rules 36-38)

### Rule 36: HetrixTools
Uptime monitoring on every live site from launch.

### Rule 37: Strix Scan
Run before launch, after big changes, every few months.

### Rule 38: Deploy Alerts
Vercel deploy failures to team Slack.

## AUTOMATED CHECKS (Rules 39-41)

### Rule 39: SEO Check
npm run seo:check validates titles, H1s, descriptions, canonicals, alt text, schema.

### Rule 40: Links Check
npm run links:check finds 404s, staging links, localhost links.

### Rule 41: CI Integration
Both checks run on every PR to main.

## FORMS (Rules 42-44)

### Rule 42: Turnstile + Honeypot
Turnstile widget + server verification + honeypot field.

### Rule 43: Form Validation
Rate limit, validate input, no open relay.

### Rule 44: Resend Email
reply-to as visitor email. Recipients in Worker config.

## COOKIE CONSENT (Rules 45-47)

### Rule 45: Cookie Banner
Categories: Necessary, Analytics, Marketing, Preferences.

### Rule 46: GTM Consent Mode v2
Denied by default. Granted after consent.

### Rule 47: Regional Compliance
EU/UK strict opt-in. US notice OK.

## BLOG (Rule 48)

### Rule 48: Common Blog Template
/blog and /blog/[slug]. Same structure every site.

## DNS (Rules 49-52)

### Rule 49: DNS Backup
Save zone before changes. Document email records.

### Rule 50: Cloudflare DNS
Copy all records. Apex + www to Vercel.

### Rule 51: Test After Switch
Test 301s. Test email delivery.

### Rule 52: Keep Old Hosting
Keep old hosting live 48 hours for rollback.

## CODE STANDARDS (Rules 53-58)

### Rule 53: Agent Rules File
RULES.md at root (this file). CLAUDE.md, AGENTS.md reference it. .cursor/rules/ for Cursor.

### Rule 54: Size Limits
Components ~200 lines. Pages ~150. Functions ~50. Over 400 must split.

### Rule 55: Structure
No copied blocks. Use design tokens. Extend with props not new files.

### Rule 56: Zero JS Default
Astro components default. React/Vue only for real interactivity.

### Rule 57: CI Gates
eslint, prettier, astro check, build must pass to merge.

### Rule 58: Single Config Source
site.ts for name/URL. contact.ts for phone/email. brand.ts for colors.

## SANITY SETUP (Rules 59-63)

### Rule 59: Shared Schema Objects
Reuse: seo.ts, imageWithAlt.ts, portableText.ts, cta.ts, siteSettings singleton.

### Rule 60: Publish Validation
Block publish if title, slug, or alt text missing.

### Rule 61: Centralized Queries
All GROQ in src/lib/content/sanity.ts. One file to maintain.

### Rule 62: Slug Change Handling
Auto 301 redirect or flag for review. Never break URLs.

### Rule 63: Separate Datasets
production and staging datasets. Never test on production.

## SPEED (Rules 64-67)

### Rule 64: Prerender Default
Prerender by default. Astro prefetch on.

### Rule 65: Form UX
Loading state. No double-submit. Clear success/error.

### Rule 66: Real Device Testing
Throttled mobile. Lighthouse > 90. Core Web Vitals pass.

### Rule 67: Sitemap Caching
s-maxage=300, stale-while-revalidate.

---

## Commands

```bash
npm run dev           # Dev server
npm run build         # Production build
npm run check         # Lint + Prettier + Astro check
npm run seo:check     # SEO validation
npm run links:check   # Broken link check
npm run prelaunch     # Build + all checks
npm run sanity:export # Backup Sanity
```

## Key Files

| Config | Location |
|--------|----------|
| Colors, fonts | src/brand.ts |
| Site name, URL | src/config/site.ts |
| Phone, email | src/config/contact.ts |
| Security headers | vercel.json |
| Sanity schemas | studio/schemas/ |
| SEO components | src/components/common/ |
| GROQ queries | src/lib/content/sanity.ts |

---

**TOTAL: 67 BUILD RULES**

This file is the single source of truth. All agents must follow these rules.
