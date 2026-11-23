import type { StructureBuilder } from 'sanity/structure';

/** Studio desk: the singletons first, then the content lists. */
export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.listItem().title('Home page').id('homePage').child(S.document().schemaType('homePage').documentId('homePage')),
      S.listItem().title('Map page').id('mapPage').child(S.document().schemaType('mapPage').documentId('mapPage')),
      S.listItem()
        .title('Business page copy')
        .id('businessPage')
        .child(S.document().schemaType('businessPage').documentId('businessPage')),
      S.listItem()
        .title('Search')
        .id('searchPage')
        .child(S.document().schemaType('searchPage').documentId('searchPage')),
      S.listItem()
        .title('About page')
        .id('aboutPage')
        .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
      S.listItem()
        .title('Owners page')
        .id('ownersPage')
        .child(S.document().schemaType('ownersPage').documentId('ownersPage')),
      S.listItem()
        .title('For businesses page')
        .id('forBusinessesPage')
        .child(S.document().schemaType('forBusinessesPage').documentId('forBusinessesPage')),
      S.listItem()
        .title('Region pages copy')
        .id('regionPage')
        .child(S.document().schemaType('regionPage').documentId('regionPage')),
      S.listItem()
        .title('Section pages')
        .id('sectionPages')
        .child(S.documentTypeList('sectionPage').title('Section pages')),
      S.divider(),
      S.documentTypeListItem('business').title('Businesses'),
      S.documentTypeListItem('category').title('Categories'),
      S.documentTypeListItem('area').title('Areas'),
      S.documentTypeListItem('region').title('Regions'),
      S.documentTypeListItem('ownerStory').title('Owner stories'),
      S.divider(),
      S.documentTypeListItem('claimRequest').title('Claim requests'),
      S.documentTypeListItem('guide').title('Guides'),
    ]);
