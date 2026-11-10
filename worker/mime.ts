import type { Enquiry, Offer, VenueStatus } from './enquiry';

const OFFER_NAMES: Record<Offer, string> = { 'rivr-club': 'A RIVR club', management: 'Management', system: 'The RIVR system' };
const VENUE_NAMES: Record<VenueStatus, string> = { 'have-venue': 'Has a venue', looking: 'Looking for a venue', 'running-club': 'Runs a club now' };

export interface EmailOptions {
  readonly from: string;
  readonly to: string;
  readonly now: Date;
  /** A unique id for the Message-ID header. */
  readonly id: string;
}

export interface OutgoingEmail {
  readonly from: string;
  readonly to: string;
  /** The whole message as RFC 5322 text, CRLF line ends. */
  readonly raw: string;
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrap(value: string, width = 76): string {
  return value.match(new RegExp(`.{1,${width}}`, 'g'))?.join('\r\n') ?? '';
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

/** The enquiry as a plain-text email from the site to the owner, replying to the enquirer. */
export function buildEnquiryEmail(enquiry: Enquiry, options: EmailOptions): OutgoingEmail {
  const subject = `Partner enquiry: ${enquiry.name}, ${enquiry.city} (${enquiry.offers.map((offer) => OFFER_NAMES[offer]).join(', ')})`;
  const headers = [
    `From: RIVR Pro <${options.from}>`,
    `To: <${options.to}>`,
    `Reply-To: <${enquiry.email}>`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`,
    `Date: ${options.now.toUTCString()}`,
    `Message-ID: <${options.id}@rivrpro.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const raw = `${headers.join('\r\n')}\r\n\r\n${wrap(base64(enquiryText(enquiry, options.now)))}`;
  return { from: options.from, to: options.to, raw };
}
