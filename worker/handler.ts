import { parseEnquiry } from './enquiry';
import { buildEnquiryEmail, type OutgoingEmail } from './mime';
import type { TurnstileVerdict } from './turnstile';

/** Everything the handler reaches outside itself, passed in so tests use fakes. */
export interface Deps {
  verifyTurnstile(token: string, ip: string | null): Promise<TurnstileVerdict>;
  /** Whether this address may send another enquiry now (a per-address rate limit). */
  allowSend(ip: string): Promise<boolean>;
  sendEmail(email: OutgoingEmail): Promise<void>;
  now(): Date;
  newId(): string;
}

export interface EnquiryConfig {
  readonly ENQUIRY_FROM: string;
  readonly ENQUIRY_TO: string;
}

const MAX_BYTES = 20_000;

/** The body, or null once it passes `limit` bytes: read in chunks, so a post with no length cannot be buffered whole. */
async function readCapped(request: Request, limit: number): Promise<Uint8Array | null> {
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** POST /api/enquiry: JSON for the page's fetch, redirects for a plain form post. Logs reasons, never personal data. */
export async function handleEnquiry(request: Request, config: EnquiryConfig, deps: Deps): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BYTES) return new Response('Too large', { status: 413 });
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const done = (status: number, body: object, location: string) =>
    wantsJson ? Response.json(body, { status }) : new Response(null, { status: 303, headers: { location } });

  const raw = await readCapped(request, MAX_BYTES);
  if (raw === null) return new Response('Too large', { status: 413 });
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

  const ip = request.headers.get('cf-connecting-ip');
  const token = data.get('cf-turnstile-response');
  const verdict = await deps.verifyTurnstile(typeof token === 'string' ? token : '', ip);
  if (verdict === 'refused') return done(403, { ok: false, reason: 'check' }, '/not-sent/');
  if (verdict === 'unavailable') {
    console.error('enquiry not sent: turnstile unavailable');
    return done(503, { ok: false, reason: 'unavailable' }, '/not-sent/');
  }
  // Counted only here, after every check, so a mistyped field never uses up a visitor's sends.
  if (!(await deps.allowSend(ip ?? 'unknown'))) {
    console.warn('enquiry refused: rate limit');
    return done(429, { ok: false, reason: 'busy' }, '/not-sent/');
  }

  try {
    await deps.sendEmail(buildEnquiryEmail(parsed.enquiry, { from: config.ENQUIRY_FROM, to: config.ENQUIRY_TO, now: deps.now(), id: deps.newId() }));
  } catch (error) {
    // The binding's message can quote addresses, so log only the error's kind.
    console.error('enquiry not sent: email', error instanceof Error ? error.name : 'unknown');
    return done(502, { ok: false, reason: 'email' }, '/not-sent/');
  }
  return done(200, { ok: true }, '/thanks/');
}
