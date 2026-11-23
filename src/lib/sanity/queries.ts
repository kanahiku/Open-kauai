/**
 * GROQ for the site. Only published documents are read (the client uses the "published"
 * perspective). Listings must be `listed != false`.
 */
export const SECTION_KEYS = ['activities', 'dining', 'stay'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const IMAGE = `{ alt, hotspot, crop, asset }`;

/** Fields needed to render a listing card and compute its open/closed status. */
const BUSINESS_FIELDS = `
  _id,
  name,
  "slug": slug.current,
  kind,
  ownership,
  priceLevel,
  knownFor,
  photo ${IMAGE},
  openingHours[] { days, opens, closes },
  hoursConfirmedAt,
  hoursKind,
  temporarilyClosed,
  reopeningDate,
  "area": area->title
`;
export const BUSINESS_CARD = `{ ${BUSINESS_FIELDS} }`;

export const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0] {
  siteName,
  description,
  headerLinks[] { label, href },
  headerAction { label, href },
  askAction { label, href },
  menuLabel,
  footerTagline,
  officialInfo { label, linkText, url },
  footerColumns[] { title, links[] { label, href } },
  listingLabels { ownedLabel, franchiseLabel, knownForLabel, homeLabel },
  phone,
  email,
  areaServed,
  socialLinks,
  notFoundTitle,
  notFoundBody,
  notFoundLinkLabel
}`;

export const HOME_PAGE_QUERY = `*[_id == "homePage"][0] {
  seoTitle,
  seoDescription,
  heroEyebrow,
  heroTitle,
  heroLede,
  heroImage ${IMAGE},
  searchPlaceholder,
  searchLocationLabel,
  searchButtonLabel,
  heroActiveSection,
  startTitle,
  seeAllLabel,
  sections[] {
    section,
    tabLabel,
    tabOrder,
    tileTitle,
    tileImage ${IMAGE},
    countNoun,
    comingSoonLabel,
    shelfEyebrow,
    shelfTitle
  },
  madeHereEyebrow,
  madeHereTitle,
  madeHereBody,
  madeHereCta { label, href },
  "madeHereBusinesses": madeHereBusinesses[]-> ${BUSINESS_CARD},
  "madeHereSelected": madeHereSelected-> {
    ${BUSINESS_FIELDS},
    "lat": location.lat,
    "lng": location.lng
  },
  "madeHerePins": madeHerePins[]-> {
    _id,
    "lat": location.lat,
    "lng": location.lng
  }
}`;

/** Per section: how many listings there are and a pool to pick the shelf from (see `pickVaried`). */
export const SECTION_LISTINGS_QUERY = `{
${SECTION_KEYS.map(
  (key) => `  "${key}": {
    "count": count(*[_type == "business" && listed != false && category->section == "${key}"]),
    "shelf": *[_type == "business" && listed != false && category->section == "${key}"]
      | order(featured desc, name asc) [0...30] ${BUSINESS_CARD}
  }`
).join(',\n')}
}`;

export const MAP_PAGE_QUERY = `*[_id == "mapPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  countNoun,
  title,
  listToggleLabel,
  mapToggleLabel,
  listToggleHref,
  openNowLabel,
  typeLabel,
  areaLabel,
  priceLabel,
  locallyOwnedLabel,
  localFranchiseLabel,
  anyLabel,
  resultsTemplate,
  emptyTitle,
  emptyBody,
  viewListingLabel,
  knownForPrefix,
  listButtonLabel,
  mapButtonLabel,
  loadingLabel,
  zoomInLabel,
  zoomOutLabel,
  regionLabels[]{ text, lat, lng }
}`;

/** Every listed business that has coordinates, with what the map list and popover need. */
export const MAP_BUSINESSES_QUERY = `*[_type == "business" && listed != false && defined(location.lat) && defined(location.lng)] | order(name asc){
  _id,
  name,
  "slug": slug.current,
  kind,
  ownership,
  priceLevel,
  knownFor,
  photo{ asset, crop, hotspot, alt },
  openingHours,
  hoursConfirmedAt,
  hoursKind,
  temporarilyClosed,
  reopeningDate,
  "lat": location.lat,
  "lng": location.lng,
  "section": category->section,
  "categoryId": category->_id,
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "categoryOrder": category->order,
  "areaId": area->_id,
  "areaSlug": area->slug.current,
  "areaTitle": area->title
}`;

/** Copy for one section page (and the matching business page variant). */
export const SECTION_PAGE_QUERY = `*[_id == $id][0]{
  section,
  seoTitle,
  seoDescription,
  breadcrumbLabel,
  title,
  allTypesLabel,
  listLabel,
  mapLabel,
  countTemplate,
  sortLabel,
  sortOpenFirstLabel,
  sortNameLabel,
  filtersTitle,
  clearAllLabel,
  openNowLabel,
  locallyOwnedLabel,
  areaTitle,
  priceTitle,
  showMoreLabel,
  emptyTitle,
  emptyBody,
  offeringsTitle,
  primaryActionLabel
}`;

/** Every listed business in a section, with what the filters need. */
export const SECTION_BUSINESSES_QUERY = `*[_type == "business" && listed != false && category->section == $section] | order(name asc){
  ${BUSINESS_FIELDS},
  "areaId": area->_id,
  "areaSlug": area->slug.current,
  "regionSlug": *[_type == "region" && references(^.area._ref)][0].slug.current,
  "regionTitle": *[_type == "region" && references(^.area._ref)][0].title,
  "regionOrder": *[_type == "region" && references(^.area._ref)][0].order,
  "categoryId": category->_id,
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "categoryOrder": category->order
}`;

export const BUSINESS_PAGE_QUERY = `*[_id == "businessPage"][0]{
  seoTitleTemplate,
  seoDescriptionTemplate,
  knownForCaption,
  mentionTitle,
  aboutTitle,
  goodToKnowTitle,
  openHeading,
  closedHeading,
  confirmHeading,
  todayTemplate,
  hoursNoteTitle,
  callLabel,
  websiteLabel,
  directionsLabel,
  nearbyTitle,
  nearbyFallbackTitle
}`;

export const BUSINESS_DETAIL_QUERY = `*[_type == "business" && listed != false && slug.current == $slug][0]{
  _id,
  name,
  "slug": slug.current,
  kind,
  ownership,
  priceLevel,
  knownFor,
  description,
  photo ${IMAGE},
  gallery[] ${IMAGE},
  mentions,
  offerings[]{ title, note },
  goodToKnow[]{ title, note },
  bookingUrl,
  openingHours[] { days, opens, closes },
  hoursNote,
  hoursConfirmedAt,
  hoursKind,
  temporarilyClosed,
  reopeningDate,
  statusNote,
  address,
  phone,
  website,
  instagram,
  "lat": location.lat,
  "lng": location.lng,
  "section": category->section,
  "categoryTitle": category->title,
  "area": area->title
}`;

/** Listed businesses inside a small box around a point, for the "Nearby" row. */
export const NEARBY_QUERY = `*[_type == "business" && listed != false && _id != $id
  && location.lat > $lat - $span && location.lat < $lat + $span
  && location.lng > $lng - $span && location.lng < $lng + $span] {
  ${BUSINESS_FIELDS},
  "lat": location.lat,
  "lng": location.lng
}`;

// ---------- About, owners, for businesses ----------
export const ABOUT_PAGE_QUERY = `*[_id == "aboutPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  lede,
  tocTitle,
  sections[]{ _key, title, body, note, labels[]{ _key, label, tone, description } }
}`;

export const OWNERS_PAGE_QUERY = `*[_id == "ownersPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  lede,
  viewListingLabel,
  sinceTemplate,
  emptyTitle,
  emptyBody
}`;

export const OWNER_STORIES_QUERY = `*[_type == "ownerStory"] | order(order asc, _createdAt asc){
  _id,
  quote,
  ownerName,
  businessLine,
  since,
  photo ${IMAGE},
  "business": business->{ name, "slug": slug.current, "area": area->title, listed, photo ${IMAGE} }
}`;

export const FOR_BUSINESSES_QUERY = `*[_id == "forBusinessesPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  lede,
  heroImages[] ${IMAGE},
  heroCaption,
  formTitle,
  businessNameLabel,
  townLabel,
  townPlaceholder,
  roleLabel,
  roles,
  emailLabel,
  ownershipLabel,
  ownershipPlaceholder,
  confirmText,
  submitLabel,
  sendingLabel,
  successTitle,
  successBody,
  errorMessage,
  invalidMessage,
  nextTitle,
  nextSteps
}`;

/** Towns for the claim form's select, and the name/town of a listing to prefill from ?business=. */
export const AREAS_QUERY = `*[_type == "area" && count(*[_type == "business" && listed != false && references(^._id)]) > 0] | order(title asc){
  _id, title, "slug": slug.current
}`;

export const PREFILL_BUSINESS_QUERY = `*[_type == "business" && listed != false && slug.current == $slug][0]{
  name, "town": area->title
}`;

// ---------- Regions ----------
export const REGION_PAGE_QUERY = `*[_id == "regionPage"][0]{
  indexSeoTitle,
  indexSeoDescription,
  indexEyebrow,
  indexTitle,
  indexLede,
  placesTemplate,
  breadcrumbLabel,
  seoTitleTemplate,
  seoDescriptionTemplate,
  eyebrow,
  townsTitle,
  mapTitle,
  mapLinkLabel,
  seeAllLabel,
  shelfTitleTemplate,
  otherRegionsTitle,
  emptyTitle,
  emptyBody
}`;

/** Every region with its towns, and how many listed businesses are in each town. */
export const REGIONS_QUERY = `*[_type == "region"] | order(order asc, title asc){
  _id,
  title,
  "slug": slug.current,
  tagline,
  description,
  "areas": areas[]->{
    _id,
    title,
    "slug": slug.current,
    "count": count(*[_type == "business" && listed != false && references(^._id)])
  }
}`;

/** Every listed business in a set of towns. */
export const REGION_BUSINESSES_QUERY = `*[_type == "business" && listed != false && area._ref in $areaIds] | order(name asc){
  ${BUSINESS_FIELDS},
  featured,
  "areaSlug": area->slug.current,
  "section": category->section,
  "lat": location.lat,
  "lng": location.lng
}`;

// ---------- Plan with AI ----------
export const PLAN_PAGE_QUERY = `*[_id == "planPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  lede,
  regionLabel,
  anyRegionLabel,
  dayLabel,
  todaySuffix,
  timeLabel,
  budgetLabel,
  interestsLabel,
  askLabel,
  askPlaceholder,
  submitLabel,
  buildingLabel,
  invalidMessage,
  errorMessage,
  limitMessage,
  "timeOptions": timeOptions[]{ _key, label, startTime, hours, stops },
  "budgetOptions": budgetOptions[]{ _key, label, maxLevel },
  "interests": interests[]{ _key, label, "categoryIds": categories[]->_id },
  resultTitleTemplate,
  resultAllRegionTitleTemplate,
  resultNote,
  stopLabelTemplate,
  minutesTemplate,
  hoursTemplate,
  whyLabel,
  viewListingLabel,
  directionsLabel,
  distanceTemplate,
  openAtTimeLabel,
  byBookingLabel,
  unconfirmedLabel,
  summaryLabel,
  basicNote,
  emptyTitle,
  emptyBody,
  travelBufferMinutes,
  howTitle,
  howPoints
}`;

/** Every listed business with a point on the map in a set of towns, with what the planner needs. */
export const PLAN_BUSINESSES_QUERY = `*[_type == "business" && listed != false && defined(location.lat) && defined(location.lng)
  && ($all || area._ref in $areaIds)] | order(name asc){
  ${BUSINESS_FIELDS},
  featured,
  "lat": location.lat,
  "lng": location.lng,
  "section": category->section,
  "categoryId": category->_id,
  "categoryTitle": category->title
}`;

// ---------- Search ----------
export const SEARCH_PAGE_QUERY = `*[_id == "searchPage"][0]{
  seoTitle,
  title,
  placeholder,
  buttonLabel,
  clearLabel,
  resultsTemplate,
  placesTitle,
  businessesTitle,
  placeCountTemplate,
  showAllLabel,
  promptTitle,
  promptBody,
  emptyTitle,
  emptyBody
}`;

/**
 * Everything the search needs, in one small query: all listed businesses with what a card shows,
 * and all towns with their region. Matching happens in code (`src/lib/search.ts`) so that
 * "kapaa" finds "Kapaʻa" and "poipu" finds "Poʻipū".
 */
export const SEARCH_INDEX_QUERY = `{
  "businesses": *[_type == "business" && listed != false] {
    ${BUSINESS_FIELDS},
    "categoryTitle": category->title,
    "section": category->section
  },
  "places": *[_type == "area"] {
    "slug": slug.current,
    title,
    "region": *[_type == "region" && references(^._id)][0].title,
    "count": count(*[_type == "business" && listed != false && references(^._id)])
  }
}`;
