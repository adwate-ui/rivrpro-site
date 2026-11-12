import { describe, expect, it } from 'vitest';
import type { Enquiry } from './enquiry';
import { buildEnquiryEmail, enquiryText } from './email';

const ENQUIRY: Enquiry = {
  name: 'Asha Verma', phone: '+919876543210', email: 'asha@example.com', city: 'Jaipur',
  offers: ['rivr-club', 'management'], venueStatus: 'have-venue', message: 'A 6-table room.\nNear the station.',
};
const OPTIONS = {
  from: 'enquiries@rivrpro.com', to: 'info@rivrpro.com',
  now: new Date('2026-11-10T12:00:00Z'), id: '1f0e2d3c-aaaa-bbbb-cccc-1234567890ab',
};

describe('enquiryText', () => {
  it('lists every answer in words', () => {
    const text = enquiryText(ENQUIRY, OPTIONS.now);
    expect(text).toContain('Name: Asha Verma');
    expect(text).toContain('Phone: +91 98765 43210');
    expect(text).toContain('Interested in: A RIVR club, Management');
    expect(text).toContain('Venue: Has a venue');
    expect(text).toContain('A 6-table room.\nNear the station.');
    expect(text).toContain('10 Nov 2026');
  });
});

describe('buildEnquiryEmail', () => {
  it('goes from the site to the inbox, replying to the enquirer, with every answer in the text', () => {
    expect(buildEnquiryEmail(ENQUIRY, OPTIONS)).toEqual({
      id: '1f0e2d3c-aaaa-bbbb-cccc-1234567890ab',
      from: 'RIVR Pro <enquiries@rivrpro.com>',
      to: 'info@rivrpro.com',
      replyTo: 'asha@example.com',
      subject: 'Partner enquiry: Asha Verma, Jaipur (A RIVR club, Management)',
      text: enquiryText(ENQUIRY, OPTIONS.now),
    });
  });
});
