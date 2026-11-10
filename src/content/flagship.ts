import type { PhotoName } from './media';

export const flagship = {
  title: 'RIVR *Gurugram*.',
  description: 'RIVR Gurugram, our flagship members-only poker club, and the proof of the RIVR system.',
  intro: 'Our flagship club in Gurugram, and the proof of the system we bring to partners.',
  chapters: [
    { photo: 'room' as PhotoName, alt: 'The room at RIVR Gurugram', title: 'The room', text: 'Built for the game first: the tables, the light, the sound and the way people move between them.' },
    { photo: 'tables' as PhotoName, alt: 'A dealt table at RIVR Gurugram', title: 'The tables', text: 'Professional dealers, clear stakes and a waitlist members can follow from their phones.' },
    { photo: 'lounge' as PhotoName, alt: 'The lounge at RIVR Gurugram', title: 'The lounge and kitchen', text: 'Food and drink ordered from the table, served without leaving the game.' },
    { photo: 'technology' as PhotoName, alt: 'RIVR technology in use at the club', title: 'The technology in use', text: 'The member app, staff console, dealer tablets and TV boards running the room every night.' },
  ],
} as const;
