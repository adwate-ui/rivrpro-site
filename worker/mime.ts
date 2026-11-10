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

/**
 * The subject as RFC 2047 encoded words of at most 75 characters (39 bytes of UTF-8 each, so a line with "Subject: " stays under 78, split between code points),
 * folded onto continuation lines.
 */
function encodedSubject(subject: string): string {
  const encoder = new TextEncoder();
  const words: string[] = [];
  let current = '';
  for (const char of subject) {
    if (encoder.encode(current + char).length > 39) {
      words.push(current);
      current = '';
    }
    current += char;
  }
  if (current !== '') words.push(current);
  return words.map((word) => `=?UTF-8?B?${base64(word)}?=`).join('\r\n ');
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
    `Subject: ${encodedSubject(subject)}`,
    // RFC 5322 §4: "GMT" is obsolete; write the zone as +0000.
    `Date: ${options.now.toUTCString().replace(/GMT$/, '+0000')}`,
    `Message-ID: <${options.id}@rivrpro.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const raw = `${headers.join('\r\n')}\r\n\r\n${wrap(base64(enquiryText(enquiry, options.now)))}`;
  return { from: options.from, to: options.to, raw };
}
