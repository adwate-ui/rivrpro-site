import type { PhotoName, ScreenName } from './media';

export const home = {
  title: 'RIVR Pro',
  description: 'Open, run or upgrade a members-only poker club with RIVR: the brand, the team and the system behind RIVR Gurugram.',
  hero: {
    eyebrow: 'RIVR Pro · Members-only poker clubs',
    title: 'Members-only poker, *run* like RIVR.',
    lead: 'RIVR Gurugram is our flagship: a private members’ club with its own app, floor console, dealer tablets and TV boards. RIVR Pro brings the same room, the same standards and the same system to partners across India.',
    primary: { label: 'Partner with RIVR', href: '/partner/' },
    secondary: { label: 'See the flagship', href: '/flagship/' },
    photo: 'hero' as PhotoName,
    photoAlt: 'The main room at RIVR Gurugram',
  },
  flagship: {
    eyebrow: 'The flagship',
    title: 'RIVR *Gurugram*.',
    text: 'A private members’ club with tables, a lounge and a kitchen, run end to end on the RIVR system.',
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
      { title: 'Site and build', text: 'Choosing the space, the floor plan, tables, lighting and fit-out.' },
      { title: 'Operations and staff', text: 'Hiring and training dealers, floor and front desk, and the routine for every shift.' },
      { title: 'Game programming', text: 'Which games and stakes run on which tables, and how the waitlist moves.' },
      { title: 'Membership and rewards', text: 'Sign-up, identity checks at the desk, points, bonus chips and promotions.' },
      { title: 'Technology', text: 'Member app, staff console, dealer tablets and TV boards, working as one.' },
      { title: 'Brand and marketing', text: 'The RIVR identity, launch campaigns, referrals and social.' },
      { title: 'Responsible play', text: 'Adults only, members only, identity checked, and house rules everyone can read.' },
    ],
  },
  technology: {
    eyebrow: 'The technology',
    title: 'One system, *four* screens.',
    screens: [
      { name: 'app-home' as ScreenName, kind: 'phone' as const, title: 'Member app', text: 'Join, request a seat, see your table, order food and drink, and keep your points.' },
      { name: 'console-floor' as ScreenName, kind: 'browser' as const, title: 'Staff console', text: 'The live floor, waitlist, members, ID checks, promotions and reports.' },
      { name: 'tablet' as ScreenName, kind: 'tablet' as const, title: 'Dealer tablet', text: 'At every table: dealers sign in and run the game from it.' },
      { name: 'tv-waitlist' as ScreenName, kind: 'tv' as const, title: 'TV boards', text: 'Waitlist, promotions and leaderboards on every screen in the room.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'How a partnership *runs*.',
    items: [
      { title: 'Enquiry', text: 'Tell us who you are, your city and your venue.' },
      { title: 'Site visit', text: 'We see the space and the market for ourselves.' },
      { title: 'Plan', text: 'A written plan: the model, the layout, the team and the timeline.' },
      { title: 'Build', text: 'Fit-out, hiring, training and setting up the system.' },
      { title: 'Open', text: 'Launch with RIVR people on the floor.' },
      { title: 'Run', text: 'Day-to-day operations, programming and regular reviews.' },
    ],
  },
  enquiry: {
    eyebrow: 'Partner with RIVR',
    title: 'Start a *conversation*.',
    text: 'Tell us where and how you would like to work with us. We read every enquiry ourselves and reply within two working days.',
  },
} as const;
