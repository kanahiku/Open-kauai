# Open Kauaʻi

Local business directory for Kauaʻi. Astro 7 (server output, Vercel) with Sanity v3 as the only content source.

All visible text, listings, images and settings come from Sanity. Nothing is hard-coded in the pages.

## Setup

```bash
npm install
cd studio && npm install && cd ..
cp .env.example .env     # fill in the Open Kauaʻi Sanity values (project ID i1q8kcrm, dataset production)
npm run dev              # site on http://localhost:4321
npm run studio           # Sanity Studio
```

`.env` is gitignored. Never commit tokens.

## Pages

| Route   | Source                                                                    |
| ------- | ------------------------------------------------------------------------- |
| `/`     | `siteSettings` + `homePage` + `business` documents                        |
| `/map/` | `siteSettings` + `mapPage` + listed `business` documents with coordinates |

| `/activities/` `/dining/` `/stay/` | `sectionPage-<section>` + listed `business` documents |
| `/business/<slug>/` | `businessPage` + `sectionPage` + the `business` document |
| `/region/` `/region/<slug>/` | `regionPage` + `region` documents + listed `business` documents |
| `/search/?q=` | `searchPage` + listed `business` and `area` documents (no indexing) |
| `/about/` | `aboutPage` |
| `/owners/` | `ownersPage` + `ownerStory` documents |
| `/for-businesses/` | `forBusinessesPage` + `area` documents (towns in the form) |

Pages are server-rendered with a short CDN cache, so open/closed status and the host-aware indexing rules stay correct.

### API routes

- `GET /api/search.json?q=` returns the suggestions under the search boxes (home hero and `/search/`).
- `POST /api/claims/` stores a "Claim your business" request as a `claimRequest` document. The ID is `claims.<uuid>`: the dot keeps it out of public dataset reads, because it holds an email address. It needs a Sanity token with write access on the server (`SANITY_WRITE_TOKEN`, or `SANITY_API_TOKEN` if that one can write). Protection: same-origin check, hidden honeypot field, field limits and a best-effort rate limit. Review requests in the Studio under "Claim requests".

## Content model (studio/schemas)

- `siteSettings`, `homePage`, `mapPage`, `businessPage`, `aboutPage`, `ownersPage`, `forBusinessesPage`, `regionPage`, `searchPage`: singleton documents (page copy).
- `sectionPage`: one per section (activities, dining, stay).
- `business`, `category`, `area`: the directory. `region` groups areas (North Shore, South Shore, ...).
- `ownerStory`: an owner's own words, shown on `/owners/`. Not seeded: owners write their own.
- `claimRequest`: created by the claim form, reviewed by the team.

## Scripts

| Command                   | What it does                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run scrape`          | Fetch listings from openkauai.org into `.cache/openkauai/`                                                                                                                                             |
| `npm run import:listings` | Write categories, areas and businesses to Sanity (`-- --dry-run` to preview). Idempotent. Never overwrites fields editors set (photo, kind, ownership, price, known-for, description, featured, slug). |
| `npm run seed:site`       | Seed `siteSettings` and `homePage`                                                                                                                                                                     |
| `npm run seed:map`        | Seed `mapPage` (`-- --force` to replace)                                                                                                                                                               |
| `npm run seed:directory`  | Seed the section pages, business page copy and listing labels (`-- --force` to replace)                                                                                                                |
| `npm run seed:pages`      | Seed About, Owners, For businesses, Region and Search copy, the five regions and footer links (`-- --force` replaces the page copy)                                                                    |
| `npm run check`           | astro check, eslint, prettier                                                                                                                                                                          |
| `npm run build`           | Production build                                                                                                                                                                                       |

Every script that writes to Sanity refuses to run unless `SANITY_PROJECT_ID` is `i1q8kcrm`.

## Business hours

Hours are stored as structured `openingHours` and evaluated in Pacific/Honolulu time (`src/lib/hours.ts`). Hours not confirmed in the last 90 days show "Hours need confirmation".

Listings without a photo use `src/assets/images/placeholder/business.jpg`.
