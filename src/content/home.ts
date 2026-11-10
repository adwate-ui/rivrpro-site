import type { PhotoName, ScreenName } from './media';

export const home = {
  title: 'RIVR Pro',
  description: 'Open or run a members-only poker club with the team and system behind RIVR Gurugram.',
  hero: {
    eyebrow: 'RIVR Pro · Members-only poker clubs',
    // U+2011, a non-breaking hyphen, so the headline never splits "Members-" from "only".
    title: 'Members‑only poker, *run* like RIVR.',
    lead: 'The team, playbook and technology behind RIVR Gurugram. Now for partners across India.',
    primary: { label: 'Partner with RIVR', href: '/partner/' },
    secondary: { label: 'See the flagship', href: '/flagship/' },
    photo: 'hero' as PhotoName,
    photoAlt: 'The main room at RIVR Gurugram',
  },
  flagship: {
    eyebrow: 'The flagship',
    title: 'RIVR *Gurugram*.',
    text: 'Tables, a lounge and a kitchen, run on the RIVR system.',
    photos: [
      { name: 'room' as PhotoName, alt: 'The room at RIVR Gurugram', caption: 'The room' },
      { name: 'tables' as PhotoName, alt: 'A dealt table at RIVR Gurugram', caption: 'The tables' },
      { name: 'lounge' as PhotoName, alt: 'The lounge at RIVR Gurugram', caption: 'The lounge' },
    ],
  },
  offers: { eyebrow: 'Partnership', title: 'Three ways to *partner*.' },
  system: {
    eyebrow: 'The system',
    title: 'Everything a club needs, *already* built.',
    items: [
      { title: 'Site and build', text: 'Space, floor plan, tables, lighting, fit-out.' },
      { title: 'Operations', text: 'Hiring and training dealers, floor and front desk.' },
      { title: 'Games', text: 'Games, stakes and the waitlist.' },
      { title: 'Membership', text: 'Sign-up, ID checks, points and promotions.' },
      { title: 'Technology', text: 'Member app, staff console, dealer tablets, TV boards.' },
      { title: 'Marketing', text: 'Brand, launch, referrals and social.' },
      { title: 'Responsible play', text: 'Adults only. Members only. ID checked.' },
    ],
  },
  technology: {
    eyebrow: 'The technology',
    title: 'One system, *four* screens.',
    screens: [
      { name: 'app-home' as ScreenName, kind: 'phone' as const, title: 'Member app', text: 'Join, get a seat, order food, track points.' },
      { name: 'console-floor' as ScreenName, kind: 'browser' as const, title: 'Staff console', text: 'The floor, waitlist, members and promotions.' },
      { name: 'tablet' as ScreenName, kind: 'tablet' as const, title: 'Dealer tablet', text: 'At every table.' },
      { name: 'tv-waitlist' as ScreenName, kind: 'tv' as const, title: 'TV boards', text: 'Waitlist, promotions and leaderboards.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'How a partnership *runs*.',
    items: [
      { title: 'Enquiry', text: 'You tell us about your plans.' },
      { title: 'Site visit', text: 'We see the space and the market.' },
      { title: 'Plan', text: 'Model, layout, team, timeline.' },
      { title: 'Build', text: 'Fit-out, hiring, training.' },
      { title: 'Open', text: 'Launch with RIVR on the floor.' },
      { title: 'Run', text: 'Operations and regular reviews.' },
    ],
  },
  enquiry: {
    eyebrow: 'Partner with RIVR',
    title: 'Let’s *talk*.',
    text: 'We reply within two working days.',
  },
} as const;
