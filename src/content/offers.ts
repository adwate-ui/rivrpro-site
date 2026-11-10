import type { ScreenName } from './media';

export interface Offer {
  readonly slug: 'rivr-club' | 'management' | 'system';
  readonly eyebrow: string;
  readonly cardTitle: string;
  readonly cardText: string;
  readonly title: string;
  readonly description: string;
  readonly intro: string;
  readonly forWho: readonly string[];
  readonly rivrProvides: readonly string[];
  readonly partnerProvides: readonly string[];
  readonly screens: readonly { name: ScreenName; kind: 'phone' | 'browser' | 'tablet' | 'tv'; alt: string }[];
}

export const offers: readonly Offer[] = [
  {
    slug: 'rivr-club', eyebrow: 'A RIVR club',
    cardTitle: 'Open a *RIVR* club.',
    cardText: 'Open under the RIVR name. We bring the brand, the system, the technology and the training; you bring the venue and the capital.',
    title: 'Open a *RIVR* club.',
    description: 'Open a members-only poker club under the RIVR name, built and opened with the RIVR team and run on the RIVR system.',
    intro: 'A members-only poker club under the RIVR name, built and opened with the RIVR team and run on the RIVR system.',
    forWho: ['Investors and operators who want an established club brand', 'Owners of a suitable venue in a city without a RIVR club'],
    rivrProvides: ['The RIVR brand and identity', 'Layout and fit-out guidance', 'Hiring and training for dealers, floor and front desk', 'The member app, staff console, dealer tablets and TV boards', 'Launch marketing and the RIVR playbook', 'Regular reviews against the RIVR standard'],
    partnerProvides: ['The venue and the capital', 'The local approvals your city requires', 'A general manager, trained by us'],
    screens: [{ name: 'app-home', kind: 'phone', alt: 'The RIVR member app' }, { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' }],
  },
  {
    slug: 'management', eyebrow: 'Management',
    cardTitle: 'Your club, *run* by RIVR.',
    cardText: 'You own the club; we run it. RIVR Pro builds, staffs and operates the room to the standard of our flagship.',
    title: 'Your club, *run* by RIVR.',
    description: 'You own the venue and the business; RIVR Pro builds, staffs and runs your members-only poker club day to day.',
    intro: 'You own the venue and the business. RIVR Pro builds it, staffs it and runs it day to day, to the standard of our flagship.',
    forWho: ['Owners and investors who want a club without running one', 'Hotels, clubs and venues adding a poker room'],
    rivrProvides: ['Fit-out and opening', 'The full team on the floor', 'Daily operations, game programming and membership', 'The RIVR system', 'Regular reporting to you'],
    partnerProvides: ['The venue and the capital', 'The approvals your venue requires', 'Agreed budgets and targets'],
    screens: [{ name: 'console-floor', kind: 'browser', alt: 'The RIVR staff console' }],
  },
  {
    slug: 'system', eyebrow: 'The RIVR system',
    cardTitle: 'The *RIVR* system, for your club.',
    cardText: 'Keep your name. License the RIVR playbook and platform to run an existing club better.',
    title: 'The *RIVR* system, for your club.',
    description: 'License the RIVR playbook and platform — member app, staff console, dealer tablets and TV boards — for an existing poker club.',
    intro: 'For a club already running: the playbook and the platform behind RIVR Gurugram, licensed to your room under your name.',
    forWho: ['Existing poker rooms and members’ clubs', 'Operators replacing paper, spreadsheets and group chats'],
    rivrProvides: ['Member app, staff console, dealer tablets and TV boards, set up for your club', 'The RIVR operating playbook', 'Training for your team', 'Support and updates'],
    partnerProvides: ['Your brand, venue and team', 'Tablets and TVs for the room', 'A lead for the rollout'],
    screens: [
      { name: 'app-card', kind: 'phone', alt: 'The member card in the RIVR app' },
      { name: 'console-members', kind: 'browser', alt: 'Members in the RIVR staff console' },
      { name: 'tablet', kind: 'tablet', alt: 'The RIVR dealer tablet' },
      { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' },
    ],
  },
];

export const offerBySlug = (slug: Offer['slug']) => offers.find((offer) => offer.slug === slug)!;
