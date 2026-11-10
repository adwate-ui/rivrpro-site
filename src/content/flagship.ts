import type { PhotoName } from './media';

export const flagship = {
  title: 'RIVR *Gurugram*.',
  description: 'RIVR Gurugram, our flagship members-only poker club.',
  intro: 'Our flagship, and the model for every partner club.',
  chapters: [
    { photo: 'room' as PhotoName, alt: 'The room at RIVR Gurugram', title: 'The room', text: 'Built around the game.' },
    { photo: 'tables' as PhotoName, alt: 'A dealt table at RIVR Gurugram', title: 'The tables', text: 'Professional dealers. Clear stakes. The waitlist on every phone.' },
    { photo: 'lounge' as PhotoName, alt: 'The lounge at RIVR Gurugram', title: 'The lounge', text: 'Food and drink, brought to the table.' },
    { photo: 'technology' as PhotoName, alt: 'RIVR technology in use at the club', title: 'The technology', text: 'App, console, tablets and TV boards, every night.' },
  ],
} as const;
