import type { Enquiry, Offer, VenueStatus } from './enquiry';

const OFFER_NAMES: Record<Offer, string> = { 'rivr-club': 'A RIVR club', management: 'Management', system: 'The RIVR system' };
const VENUE_NAMES: Record<VenueStatus, string> = { 'have-venue': 'Has a venue', looking: 'Looking for a venue', 'running-club': 'Runs a club now' };

export interface EmailOptions {
  readonly from: string;
  readonly to: string;
  readonly now: Date;
  /** Unique per enquiry: the sender's idempotency key, so a retry never sends twice. */
  readonly id: string;
}

/** One enquiry email, as plain fields for the sending API. */
export interface OutgoingEmail {
  readonly id: string;
  /** "RIVR Pro <address>". */
  readonly from: string;
  readonly to: string;
  /** The enquirer: answering the email answers them. */
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

function readablePhone(phone: string): string {
  return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;
}

/** The email's words: every answer on its own line, then when it was sent (IST). */
export function enquiryText(enquiry: Enquiry, now: Date): string {
  const sent = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(now);
  return [
    'New partner enquiry from rivrpro.com',
    '',
    `Name: ${enquiry.name}`,
    `Phone: ${readablePhone(enquiry.phone)}`,
    `Email: ${enquiry.email}`,
    `City: ${enquiry.city}`,
    `Interested in: ${enquiry.offers.map((offer) => OFFER_NAMES[offer]).join(', ')}`,
    `Venue: ${VENUE_NAMES[enquiry.venueStatus]}`,
    '',
    'Message:',
    enquiry.message === '' ? '(none)' : enquiry.message,
    '',
    `Sent ${sent} IST. Reply to this email to answer them.`,
  ].join('\n');
}

/** The enquiry as an email from the site to the inbox, replying to the enquirer. */
export function buildEnquiryEmail(enquiry: Enquiry, options: EmailOptions): OutgoingEmail {
  const offers = enquiry.offers.map((offer) => OFFER_NAMES[offer]).join(', ');
  return {
    id: options.id,
    from: `RIVR Pro <${options.from}>`,
    to: options.to,
    replyTo: enquiry.email,
    subject: `Partner enquiry: ${enquiry.name}, ${enquiry.city} (${offers})`,
    text: enquiryText(enquiry, options.now),
  };
}
