# Agent Instructions

**Read RULES.md for ALL 67 detailed rules.**

This file is a quick reference. The complete rules are in RULES.md at repo root.

## Critical Rules (Always Apply)

### Security
- Secrets in env vars only (Rule 4)
- Security headers in vercel.json (Rule 3)
- No staging URLs in production (Rule 7)

### SEO
- Unique title 50-60 chars per page (Rule 24)
- Unique description 120-160 chars (Rule 24)
- One H1 per page (Rule 35)
- Alt text on every image (Rule 34)
- JSON-LD schema on every page (Rule 29)

### Code
- Components max 200 lines (Rule 54)
- Extend with props, no duplicates (Rule 55)
- Zero JS unless needed (Rule 56)

### Before Merge
- npm run check must pass (Rule 57)
- npm run seo:check must pass (Rule 39)
- npm run links:check must pass (Rule 40)

## Key Files

| Config | Location |
|--------|----------|
| All 67 rules | RULES.md |
| Colors, fonts | src/brand.ts |
| Site config | src/config/site.ts |
| Contact info | src/config/contact.ts |
| Security headers | vercel.json |

## Commands

```bash
npm run dev         # Dev server
npm run build       # Build
npm run check       # Lint
npm run prelaunch   # Build + checks
```

**For complete rules, read RULES.md**
