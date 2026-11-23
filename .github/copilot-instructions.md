# Copilot Instructions

This is an Astro + Sanity CMS boilerplate. Follow these rules:

## Key Files
- Colors, fonts, radius: src/brand.ts
- Site config: src/config/site.ts
- Contact info: src/config/contact.ts
- Sanity schemas: studio/schemas/

## Code Standards
- Components max 200 lines
- Pages max 150 lines
- Functions max 50 lines
- No React/Vue unless real interactivity needed
- Extend components with props, dont create duplicates

## SEO Requirements
- Every page needs unique title (50-60 chars) and description (120-160 chars)
- One H1 per page, headings in order
- All images need alt text
- JSON-LD schema on every page

## Security
- Secrets only in env vars, never in code
- No staging/localhost URLs in production

## Before Merge
- npm run check must pass
- npm run seo:check must pass
- npm run links:check must pass

See .cursor/rules/ and CLAUDE.md for complete 67 rules.
