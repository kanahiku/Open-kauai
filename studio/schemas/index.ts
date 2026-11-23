/**
 * Open Kauaʻi Sanity schema.
 * Singletons: siteSettings, homePage, mapPage, businessPage, aboutPage, ownersPage, forBusinessesPage, regionPage,
 * searchPage. Documents: sectionPage (one per section), business, category, area, region, ownerStory,
 * claimRequest, guide.
 * Object: openingHours. Add new types here and list them in `schemaTypes`.
 */
import { aboutPage } from './documents/aboutPage';
import { area } from './documents/area';
import { business } from './documents/business';
import { businessPage } from './documents/businessPage';
import { category } from './documents/category';
import { claimRequest } from './documents/claimRequest';
import { forBusinessesPage } from './documents/forBusinessesPage';
import { guide } from './documents/guide';
import { homePage } from './documents/homePage';
import { mapPage } from './documents/mapPage';
import { ownersPage } from './documents/ownersPage';
import { ownerStory } from './documents/ownerStory';
import { region } from './documents/region';
import { regionPage } from './documents/regionPage';
import { searchPage } from './documents/searchPage';
import { sectionPage } from './documents/sectionPage';
import { siteSettings } from './documents/siteSettings';
import { openingHours } from './objects/openingHours';

export const schemaTypes = [
  siteSettings,
  homePage,
  mapPage,
  businessPage,
  aboutPage,
  ownersPage,
  forBusinessesPage,
  regionPage,
  searchPage,
  sectionPage,
  category,
  area,
  region,
  business,
  ownerStory,
  claimRequest,
  guide,
  openingHours,
];
