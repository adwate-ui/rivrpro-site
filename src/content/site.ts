/** Site-wide settings. The three owner inputs stay empty until given; scripts/check-launch.mjs refuses a launch while they are. */
export const site = {
  name: 'RIVR Pro',
  url: 'https://rivrpro.com',
  /** WhatsApp number, digits with country code (e.g. 919876543210). Empty hides the WhatsApp buttons. */
  whatsapp: '',
  /** Legal entity for the footer and privacy notice. */
  entity: '',
  /** Shown after the entity, e.g. "CIN … · GSTIN …"; empty shows nothing. */
  entityIds: '',
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string,
} as const;

export const whatsappText = "Hello RIVR Pro, I'd like to talk about partnering.";

export const nav = [
  { href: '/rivr-club/', label: 'A RIVR club' },
  { href: '/management/', label: 'Management' },
  { href: '/system/', label: 'The system' },
  { href: '/flagship/', label: 'Flagship' },
] as const;

export const legalLinks = [
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
  { href: '/responsible-play/', label: 'Responsible play' },
] as const;
