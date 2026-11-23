import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';

import { schemaTypes } from './schemas';
import { structure } from './structure';

export default defineConfig({
  name: 'open-kauai',
  title: 'Open Kauaʻi',

  // No fallback project: an unset env must fail, never open another client's Studio.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [structureTool({ structure }), visionTool()],

  schema: {
    types: schemaTypes,
  },

  // Singletons are edited from the desk. They must not appear in the "New document" menu.
  document: {
    newDocumentOptions: (prev) =>
      prev.filter(
        (item) =>
          ![
            'siteSettings',
            'homePage',
            'mapPage',
            'businessPage',
            'aboutPage',
            'ownersPage',
            'forBusinessesPage',
            'regionPage',
            'searchPage',
            'sectionPage',
            'claimRequest',
          ].includes(item.templateId)
      ),
  },
});
