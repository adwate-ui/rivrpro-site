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

function decodeBody(raw: string): string {
  const body = raw.split('\r\n\r\n')[1]!.replace(/\r\n/g, '');
  return new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)));
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

  it('encodes the subject so any name survives', () => {
    const subject = head!.split('\r\n').find((line) => line.startsWith('Subject: '))!;
    const encoded = subject.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/)![1]!;
    expect(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))))
      .toBe('Partner enquiry: Asha Verma, Jaipur (A RIVR club, Management)');
  });

  it('carries the body as base64 lines of at most 76 characters', () => {
    const lines = email.raw.split('\r\n\r\n')[1]!.split('\r\n');
    expect(lines.every((line) => line.length <= 76)).toBe(true);
    expect(decodeBody(email.raw)).toBe(enquiryText(ENQUIRY, OPTIONS.now));
  });
});
