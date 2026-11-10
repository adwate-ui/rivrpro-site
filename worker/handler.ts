import { parseEnquiry } from './enquiry';
import { buildEnquiryEmail, type OutgoingEmail } from './mime';

/** Everything the handler reaches outside itself, passed in so tests use fakes. */
export interface Deps {
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  sendEmail(email: OutgoingEmail): Promise<void>;
  now(): Date;
  newId(): string;
}

export interface EnquiryConfig {
  readonly ENQUIRY_FROM: string;
  readonly ENQUIRY_TO: string;
}

const MAX_BYTES = 20_000;

/** POST /api/enquiry: JSON for the page's fetch, redirects for a plain form post. Logs reasons, never personal data. */
export async function handleEnquiry(request: Request, config: EnquiryConfig, deps: Deps): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BYTES) return new Response('Too large', { status: 413 });
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const done = (status: number, body: object, location: string) =>
    wantsJson ? Response.json(body, { status }) : new Response(null, { status: 303, headers: { location } });

  // A chunked post has no content-length, so measure what actually arrived too.
  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_BYTES) return new Response('Too large', { status: 413 });
  let data: FormData;
  try {
    data = await new Response(raw, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch {
    return done(400, { ok: false, errors: [] }, '/not-sent/');
  }
  // Bots fill the hidden "website" field; tell them it worked and do nothing.
  if (typeof data.get('website') === 'string' && data.get('website') !== '') return done(200, { ok: true }, '/thanks/');

  const parsed = parseEnquiry(data);
  if (!parsed.ok) return done(400, { ok: false, errors: parsed.errors }, '/not-sent/');

  const token = data.get('cf-turnstile-response');
  const isHuman = await deps.verifyTurnstile(typeof token === 'string' ? token : '', request.headers.get('cf-connecting-ip'));
  if (!isHuman) {
    console.warn('enquiry refused: turnstile');
    return done(403, { ok: false, reason: 'check' }, '/not-sent/');
  }

  try {
    await deps.sendEmail(buildEnquiryEmail(parsed.enquiry, { from: config.ENQUIRY_FROM, to: config.ENQUIRY_TO, now: deps.now(), id: deps.newId() }));
  } catch (error) {
    console.error('enquiry not sent: email', error instanceof Error ? error.message : 'unknown');
    return done(502, { ok: false, reason: 'email' }, '/not-sent/');
  }
  return done(200, { ok: true }, '/thanks/');
}
