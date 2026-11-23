/**
 * Static dummy day for the Plan with AI page. For now, Build my day shows this instead of calling a
 * server. The stops are real listings, so the links and photos work.
 */
export interface SampleStop {
  time: string;
  label: string;
  name: string;
  href: string;
  photo: string;
  meta: string;
  price: string;
  ownership?: 'local' | 'franchise';
  ownershipLabel: string;
  why: string;
  statusLabel: string;
  open: boolean;
  directionsUrl: string;
  distance: string;
}

export interface SampleDay {
  note: string;
  basicNote: string;
  stops: SampleStop[];
}

const photo = (id: string, crop: string) =>
  `https://cdn.sanity.io/images/i1q8kcrm/production/${id}?${crop}w=640&h=640&fit=crop&auto=format`;

export const SAMPLE_DAY: SampleDay = {
  note: 'Visit times are estimates. Drive times are not included, so check directions between stops.',
  basicNote: 'This is a sample day. Live recommendations are coming soon.',
  stops: [
    {
      time: '9 am',
      label: 'Stop 1 · Brunch · about 1 hr',
      name: 'Break & Feast',
      href: '/business/break-and-feast/',
      photo: photo('2153539a06d724c45b903ad9acbbebfced750460-1800x1200.jpg', 'rect=300,0,1200,1200&'),
      meta: 'Kōloa · Brunch',
      price: '$$',
      ownership: 'local',
      ownershipLabel: 'Locally owned',
      why: 'The loco moco with demi glaze and crispy onions',
      statusLabel: 'Open at this time',
      open: true,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.9045481,-159.4642784',
      distance: '',
    },
    {
      time: '10:30 am',
      label: 'Stop 2 · Lūʻau · about 1.5 hr',
      name: 'Aulii Luau',
      href: '/business/aulii-luau/',
      photo: photo('3e2c421d2b7503da30385d6a537094ac960c33d2-1800x1800.jpg', ''),
      meta: 'Poʻipū · Lūʻau',
      price: '$$$',
      ownership: 'local',
      ownershipLabel: 'Locally owned',
      why: 'A Native Hawaiian-owned oceanfront lūʻau in Poʻipū',
      statusLabel: 'By booking',
      open: false,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.876098,-159.4618809',
      distance: '2.0 mi straight-line from the last stop',
    },
    {
      time: '12:30 pm',
      label: 'Stop 3 · Beach grill · about 1 hr',
      name: "Brennecke's Beach Broiler",
      href: '/business/brenneckes-beach-broiler/',
      photo: photo('a80ce852dd14e7e468ca3abff42ae861a5634d3c-1350x1800.jpg', 'rect=0,225,1350,1350&'),
      meta: 'Poʻipū · Beach grill',
      price: '$$',
      ownership: 'local',
      ownershipLabel: 'Locally owned',
      why: 'Kiawe-grilled fish and burgers upstairs across from Poʻipū Beach Park',
      statusLabel: 'Open at this time',
      open: true,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.8739747,-159.4530355',
      distance: '0.6 mi straight-line from the last stop',
    },
    {
      time: '2 pm',
      label: 'Stop 4 · Kayak and hike tour · about 1.5 hr',
      name: 'Outfitters Kauai',
      href: '/business/outfitters-kauai/',
      photo: photo('a3938f6b86533139a22c9bf3f70a3a3040eefd06-1800x1181.jpg', 'rect=310,0,1181,1181&'),
      meta: 'Līhuʻe · Kayak and hike tour',
      price: '$$$',
      ownership: 'local',
      ownershipLabel: 'Locally owned',
      why: 'Kayaking to a private waterfall with a rope swing',
      statusLabel: 'By booking',
      open: false,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.9501252,-159.420624',
      distance: '5.7 mi straight-line from the last stop',
    },
    {
      time: '4 pm',
      label: 'Stop 5 · Beachfront restaurant · about 1 hr',
      name: "Duke's Kauai",
      href: '/business/dukes-kauai/',
      photo: photo('0be0ee6428fbe9435136f97a4e917bc8d2d406fe-1294x1800.jpg', 'rect=0,253,1294,1294&'),
      meta: 'Līhuʻe · Beachfront restaurant',
      price: '$$',
      ownershipLabel: '',
      why: 'Fresh fish on Kalapaki Beach and a slice of Hula Pie',
      statusLabel: 'Open at this time',
      open: true,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.9618453,-159.3495858',
      distance: '4.6 mi straight-line from the last stop',
    },
  ],
};
