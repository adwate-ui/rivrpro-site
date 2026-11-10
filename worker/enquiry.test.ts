import { describe, expect, it } from 'vitest';
import { parseEnquiry } from './enquiry';

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const each of Array.isArray(value) ? value : [value]) data.append(key, each);
  }
  return data;
}

const GOOD = {
  name: '  Asha   Verma ', phone: '+91 98765-43210', email: 'Asha@Example.com ', city: 'Jaipur',
  offers: ['rivr-club', 'system'], venueStatus: 'have-venue', message: 'A 6-table room.',
};

describe('parseEnquiry', () => {
  it('accepts a good enquiry and tidies it', () => {
    expect(parseEnquiry(form(GOOD))).toEqual({
      ok: true,
      enquiry: {
        name: 'Asha Verma', phone: '+919876543210', email: 'asha@example.com', city: 'Jaipur',
        offers: ['rivr-club', 'system'], venueStatus: 'have-venue', message: 'A 6-table room.',
      },
    });
  });

  it('accepts a mobile with +91, 91, 0 or nothing in front', () => {
    for (const phone of ['+919876543210', '919876543210', '91 98765 43210', '09876543210', '9876543210']) {
      const result = parseEnquiry(form({ ...GOOD, phone }));
      expect(result.ok && result.enquiry.phone, phone).toBe('+919876543210');
    }
  });

  it('names every field it refuses, in form order', () => {
    const result = parseEnquiry(form({ name: 'A', phone: '12345', email: 'nope', city: '', venueStatus: 'castle' }));
    expect(result).toEqual({ ok: false, errors: ['name', 'phone', 'email', 'city', 'offers', 'venueStatus'] });
  });

  it('refuses unknown offers and a message over 2,000 characters', () => {
    const result = parseEnquiry(form({ ...GOOD, offers: ['free-money'], message: 'x'.repeat(2001) }));
    expect(result).toEqual({ ok: false, errors: ['offers', 'message'] });
  });

  it('refuses line breaks in one-line fields, which could forge email headers', () => {
    const result = parseEnquiry(form({ ...GOOD, name: 'Asha\r\nBcc: x@y.z', email: 'a@b.co\nBcc: x@y.z' }));
    expect(result).toEqual({ ok: false, errors: ['name', 'email'] });
  });

  it('refuses invisible control and direction characters in one-line fields', () => {
    for (const bad of ['Asha\u0085Verma', 'Asha\u202eVerma', 'Asha\u2028Verma', 'Asha\u200bVerma']) {
      expect(parseEnquiry(form({ ...GOOD, name: bad, city: bad })), JSON.stringify(bad)).toEqual({ ok: false, errors: ['name', 'city'] });
    }
  });

  it('takes only a plain ASCII email with one address', () => {
    for (const email of ['a@evil.com>,<b@x.co', 'x@y.z>\u0085Content-Type:text/html', 'ü@example.com', '\u202emoc.live@x.com', 'a b@x.co']) {
      expect(parseEnquiry(form({ ...GOOD, email })), JSON.stringify(email)).toEqual({ ok: false, errors: ['email'] });
    }
    expect(parseEnquiry(form({ ...GOOD, email: "o'brien+club@mail.example.co.in" })).ok).toBe(true);
  });

  it('accepts digits in one-line fields', () => {
    const result = parseEnquiry(form({ ...GOOD, name: 'Asha Verma 2nd', city: 'Sector 29, Gurugram 122002', email: 'asha2089@example.com' }));
    expect(result.ok).toBe(true);
  });

  it('allows an empty message, keeps its line breaks and strips pasted control characters', () => {
    expect(parseEnquiry(form({ ...GOOD, message: '' })).ok).toBe(true);
    const result = parseEnquiry(form({ ...GOOD, message: 'Line one\r\nLine\ttwo\u000b\u0007' }));
    expect(result.ok && result.enquiry.message).toBe('Line one\nLine\ttwo');
  });
});
