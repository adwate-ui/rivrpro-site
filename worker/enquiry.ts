/** The three ways to partner, as the form sends them. */
export const OFFERS = ['rivr-club', 'management', 'system'] as const;
export type Offer = (typeof OFFERS)[number];

/** Where the enquirer stands with a venue. */
export const VENUE_STATUSES = ['have-venue', 'looking', 'running-club'] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export interface Enquiry {
  readonly name: string;
  /** +91 and ten digits. */
  readonly phone: string;
  readonly email: string;
  readonly city: string;
  readonly offers: readonly Offer[];
  readonly venueStatus: VenueStatus;
  /** Possibly empty; line breaks kept as \n. */
  readonly message: string;
}

/** The form's fields, in the order the form shows them. */
export const FIELDS = ['name', 'phone', 'email', 'city', 'offers', 'venueStatus', 'message'] as const;
export type Field = (typeof FIELDS)[number];

export type ParseResult = { ok: true; enquiry: Enquiry } | { ok: false; errors: Field[] };

const LINE_BREAK = /[\r\n]/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

/** One line of text: trimmed, inner spaces collapsed; null if it has a line break or a control character. */
function oneLine(raw: string): string | null {
  if (LINE_BREAK.test(raw) || CONTROL.test(raw)) return null;
  return raw.trim().replace(/\s+/g, ' ');
}

function mobile(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, '').replace(/^\+91|^0/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/** Reads and checks a partner enquiry: the tidied enquiry, or every field that is wrong, in form order. */
export function parseEnquiry(data: FormData): ParseResult {
  const errors: Field[] = [];
  const name = oneLine(text(data, 'name'));
  if (name === null || name.length < 2 || name.length > 100) errors.push('name');
  const phone = mobile(text(data, 'phone'));
  if (phone === null) errors.push('phone');
  const email = oneLine(text(data, 'email'))?.toLowerCase() ?? null;
  if (email === null || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  const city = oneLine(text(data, 'city'));
  if (city === null || city.length < 2 || city.length > 60) errors.push('city');
  const offerValues = data.getAll('offers').filter((value): value is string => typeof value === 'string');
  const offers = [...new Set(offerValues)];
  if (offers.length === 0 || !offers.every((offer) => isOneOf(OFFERS, offer))) errors.push('offers');
  const venueStatus = text(data, 'venueStatus');
  if (!isOneOf(VENUE_STATUSES, venueStatus)) errors.push('venueStatus');
  const message = text(data, 'message').replace(/\r\n?/g, '\n').trim();
  if (message.length > 2000 || CONTROL.test(message)) errors.push('message');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    enquiry: {
      name: name!, phone: phone!, email: email!, city: city!,
      offers: offers as Offer[], venueStatus: venueStatus as VenueStatus, message,
    },
  };
}
