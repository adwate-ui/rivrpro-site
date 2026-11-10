import { describe, expect, it } from 'vitest';
import type { Enquiry } from './enquiry';
import { buildEnquiryEmail, enquiryText } from './mime';

const ENQUIRY: Enquiry = {
  name: 'Asha Verma', phone: '+919876543210', email: 'asha@example.com', city: 'Jaipur',
  offers: ['rivr-club', 'management'], venueStatus: 'have-venue', message: 'A 6-table room.\nNear the station.',
};
const OPTIONS = {
  from: 'enquiries@rivrpro.com', to: 'owner@example.com',
  now: new Date('2026-11-10T12:00:00Z'), id: '1f0e2d3c-aaaa-bbbb-cccc-1234567890ab',
};

const fromBase64 = (value: string) => new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));

function decodeBody(raw: string): string {
  return fromBase64(raw.split('\r\n\r\n')[1]!.replace(/\r\n/g, ''));
}

/** The Subject header, unfolded, with each encoded word decoded and joined. */
function decodeSubject(head: string): string {
  const unfolded = head.replace(/\r\n /g, ' ');
  const line = unfolded.split('\r\n').find((each) => each.startsWith('Subject: '))!;
  return [...line.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((match) => fromBase64(match[1]!)).join('');
}

describe('enquiryText', () => {
  it('lists every answer in words', () => {
    const textBody = enquiryText(ENQUIRY, OPTIONS.now);
    expect(textBody).toContain('Name: Asha Verma');
    expect(textBody).toContain('Phone: +91 98765 43210');
    expect(textBody).toContain('Interested in: A RIVR club, Management');
    expect(textBody).toContain('Venue: Has a venue');
    expect(textBody).toContain('A 6-table room.\nNear the station.');
    expect(textBody).toContain('10 Nov 2026');
  });
});

describe('buildEnquiryEmail', () => {
  const email = buildEnquiryEmail(ENQUIRY, OPTIONS);
  const [head] = email.raw.split('\r\n\r\n');

  it('addresses the owner and replies to the enquirer', () => {
    expect(email.from).toBe('enquiries@rivrpro.com');
    expect(email.to).toBe('owner@example.com');
    expect(head).toContain('From: RIVR Pro <enquiries@rivrpro.com>');
    expect(head).toContain('To: <owner@example.com>');
    expect(head).toContain('Reply-To: <asha@example.com>');
    expect(head).toContain('Message-ID: <1f0e2d3c-aaaa-bbbb-cccc-1234567890ab@rivrpro.com>');
    expect(head).toContain('Content-Type: text/plain; charset=UTF-8');
  });

  it('dates it with a numeric zone, as RFC 5322 asks', () => {
    expect(head).toContain('Date: Tue, 10 Nov 2026 12:00:00 +0000');
  });

  it('encodes the subject in folded words of at most 75 characters, any name surviving', () => {
    expect(decodeSubject(head!)).toBe('Partner enquiry: Asha Verma, Jaipur (A RIVR club, Management)');
    const long = buildEnquiryEmail({ ...ENQUIRY, name: 'Ānanya Śrīnivāsan '.repeat(5).trim(), offers: ['rivr-club', 'management', 'system'] }, OPTIONS);
    const longHead = long.raw.split('\r\n\r\n')[0]!;
    expect(decodeSubject(longHead)).toBe(`Partner enquiry: ${'Ānanya Śrīnivāsan '.repeat(5).trim()}, Jaipur (A RIVR club, Management, The RIVR system)`);
    for (const word of longHead.match(/=\?UTF-8\?B\?[^?]+\?=/g)!) expect(word.length).toBeLessThanOrEqual(75);
    expect(longHead.split('\r\n').every((line) => line.length <= 78)).toBe(true);
  });

  it('carries the body as base64 lines of at most 76 characters', () => {
    const lines = email.raw.split('\r\n\r\n')[1]!.split('\r\n');
    expect(lines.every((line) => line.length <= 76)).toBe(true);
    expect(decodeBody(email.raw)).toBe(enquiryText(ENQUIRY, OPTIONS.now));
  });
});
