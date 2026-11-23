# Go-Live Checklist

Complete each item before, during, and after launch. Check off as you go.

---

## Before Go-Live (On Staging)

### SEO & Content
- [ ] **SEO Meta**: Unique title and description on every page and blog. One H1, H2s in order.
- [ ] **404 / Links**: No broken internal links. Custom 404 works. Unknown Sanity slug gives 404.
- [ ] **Internal Links**: None point to staging, old domain, or localhost.
- [ ] **Canonical**: Correct production canonical on every indexable page.
- [ ] **Indexing**: Needed pages indexable, test pages noindex. Staging blocked (remove at launch).
- [ ] **Sitemap**: Has every page and blog, new Sanity post shows up, no noindex pages, production URLs.
- [ ] **Schema**: Correct types, passes Rich Results Test. Custom schema works where added.
- [ ] **SEO Panel**: Every page has title, description, canonical, noindex toggle, share image filled.
- [ ] **Images**: Alt text everywhere, WebP/AVIF served, under size target, hero not lazy.

### Functionality
- [ ] **Forms**: Every form submits, Resend email arrives, reply-to works, Turnstile checked on server, spam rejected, loading/success/error shown.
- [ ] **Phone / Email**: All clickable (tel:, mailto:) and correct.
- [ ] **Redirects**: 301 map tested. No chains or loops.

### Performance & Security
- [ ] **Speed**: Lighthouse mobile and Core Web Vitals okay. Clicks feel instant on throttled mobile.
- [ ] **Cookies + Analytics**: Banner works, GTM/GA4 blocked before consent, fire after. No duplicate tags.
- [ ] **Security**: Headers present, no secrets in repo, Sanity CORS and tokens set, Strix scan reviewed.

### Code Quality
- [ ] **Code Quality**: Lint, astro check, and build pass. No oversized files, no debug code.
- [ ] **Content**: No test content, placeholder text, or test URLs. No drafts on the site.

### Backup
- [ ] **Backup**: Release tag made, Sanity export taken and stored.

---

## At Launch (DNS Switch)

- [ ] **DNS**: All needed records set. Nothing deleted blindly.
- [ ] **Domain**: Main domain correct. www and apex redirect working.
- [ ] **HTTPS**: Valid SSL, HTTP to HTTPS, no mixed content, Cloudflare Full (strict).
- [ ] **Staging Noindex**: Removed from robots.txt, allows crawling.

---

## After Go-Live (Same Day, Then 48 Hours)

### Immediate (Same Day)
- [ ] **Email DNS**: MX, SPF, DKIM, DMARC intact. Test email sent and received.
- [ ] **Sitemap + Robots**: Both live on production domain. Sitemap submitted in GSC.
- [ ] **GSC + GTM**: Property verified. GTM firing on production (Tag Assistant).
- [ ] **Analytics**: GA4 gets live hits. Conversions and form events tested on production.
- [ ] **Live Tests**: Submit a live form. Check top 10 old URL redirects.
- [ ] **Final Crawl**: `npm run seo:check` + `npm run links:check` on production. Zero errors.
- [ ] **Monitoring**: HetrixTools monitor on, test alert received. Cloudflare WAF/bot settings on.
- [ ] **Webhook Test**: Publish a small Sanity change. Live site and sitemap update by themselves.

### 48 Hours Later
- [ ] **48 Hour Recheck**: GSC errors, 404 report, email still working. Then retire old hosting.

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Developer | | |
| QA | | |
| Client | | |
