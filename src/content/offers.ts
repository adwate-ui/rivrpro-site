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
    cardText: 'Your venue and capital. Our name, system and team.',
    title: 'Open a *RIVR* club.',
    description: 'Open a members-only poker club under the RIVR name.',
    intro: 'A RIVR club in your city, built and opened with our team.',
    forWho: ['Investors who want a proven club brand', 'Venue owners in a city without a RIVR club'],
    rivrProvides: ['The RIVR brand', 'Layout and fit-out', 'Hiring and training', 'Member app, console, dealer tablets, TV boards', 'Launch marketing', 'Standards reviews'],
    partnerProvides: ['Venue and capital', 'Local approvals', 'A general manager (we train them)'],
    screens: [{ name: 'app-home', kind: 'phone', alt: 'The RIVR member app' }, { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' }],
  },
  {
    slug: 'management', eyebrow: 'Management',
    cardTitle: 'Your club, *run* by RIVR.',
    cardText: 'You own it. We build, staff and run it.',
    title: 'Your club, *run* by RIVR.',
    description: 'Own a members-only poker club. RIVR builds, staffs and runs it.',
    intro: 'You own the venue and the business. We build it, staff it and run it.',
    forWho: ['Owners who want a club without running one', 'Hotels and clubs adding a poker room'],
    rivrProvides: ['Fit-out and opening', 'The floor team', 'Daily operations and membership', 'The RIVR system', 'Regular reports'],
    partnerProvides: ['Venue and capital', 'Approvals', 'Agreed budgets and targets'],
    screens: [{ name: 'console-floor', kind: 'browser', alt: 'The RIVR staff console' }],
  },
  {
    slug: 'system', eyebrow: 'The RIVR system',
    cardTitle: 'The *RIVR* system, for your club.',
    cardText: 'Your club, on our playbook and platform.',
    title: 'The *RIVR* system, for your club.',
    description: 'License the RIVR playbook and platform for a poker club that is already open.',
    intro: 'The playbook and platform behind RIVR Gurugram, licensed to your club.',
    forWho: ['Poker rooms already open', 'Clubs running on paper and group chats'],
    rivrProvides: ['Member app, console, dealer tablets, TV boards', 'The operating playbook', 'Team training', 'Support and updates'],
    partnerProvides: ['Your venue and team', 'Tablets and TVs', 'One person to lead the rollout'],
    screens: [
      { name: 'app-card', kind: 'phone', alt: 'The member card in the RIVR app' },
      { name: 'console-members', kind: 'browser', alt: 'Members in the RIVR staff console' },
      { name: 'tablet', kind: 'tablet', alt: 'The RIVR dealer tablet' },
      { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' },
    ],
  },
];

export const offerBySlug = (slug: Offer['slug']) => offers.find((offer) => offer.slug === slug)!;
