import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEnquiry, type Deps } from './handler';

const CONFIG = { ENQUIRY_FROM: 'enquiries@rivrpro.com', ENQUIRY_TO: 'owner@example.com' };
const GOOD = {
  name: 'Asha Verma', phone: '9876543210', email: 'asha@example.com', city: 'Jaipur',
  offers: 'system', venueStatus: 'running-club', message: '', 'cf-turnstile-response': 'token',
};

function post(fields: Record<string, string>, json = false, headers: Record<string, string> = {}): Request {
  return new Request('https://rivrpro.com/api/enquiry', {
    method: 'POST', body: new URLSearchParams(fields),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '203.0.113.9', ...(json ? { accept: 'application/json' } : {}), ...headers },
  });
}

/** A post whose body is a stream with no content-length, as a chunked upload arrives. */
function chunked(bytes: number): Request {
  const chunk = new TextEncoder().encode('x'.repeat(1024));
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) { controller.close(); return; }
      sent += chunk.length;
      controller.enqueue(chunk);
    },
  });
  return new Request('https://rivrpro.com/api/enquiry', {
    method: 'POST', body, duplex: 'half', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
  } as RequestInit);
}

let deps: Deps & { sendEmail: ReturnType<typeof vi.fn>; verifyTurnstile: ReturnType<typeof vi.fn>; allowSend: ReturnType<typeof vi.fn> };
beforeEach(() => {
  deps = {
    verifyTurnstile: vi.fn(async () => 'passed' as const),
    allowSend: vi.fn(async () => true),
    sendEmail: vi.fn(async () => undefined),
    now: () => new Date('2026-11-10T12:00:00Z'),
    newId: () => 'id-1',
  };
});

describe('handleEnquiry', () => {
  it('sends the email and redirects a plain post to /thanks/', async () => {
    const response = await handleEnquiry(post(GOOD), CONFIG, deps);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/thanks/');
    expect(deps.verifyTurnstile).toHaveBeenCalledWith('token', '203.0.113.9');
    expect(deps.allowSend).toHaveBeenCalledWith('203.0.113.9');
    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(deps.sendEmail.mock.calls[0]![0]).toMatchObject({ from: 'RIVR Pro <enquiries@rivrpro.com>', to: 'owner@example.com', replyTo: 'asha@example.com' });
  });

  it('answers JSON to a fetch', async () => {
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('names the bad fields, before checking Turnstile', async () => {
    const response = await handleEnquiry(post({ ...GOOD, phone: '12', city: '' }, true), CONFIG, deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, errors: ['phone', 'city'] });
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
    const plain = await handleEnquiry(post({ ...GOOD, phone: '12' }), CONFIG, deps);
    expect([plain.status, plain.headers.get('location')]).toEqual([303, '/not-sent/']);
  });

  it('refuses a failed spam check without sending', async () => {
    deps.verifyTurnstile.mockResolvedValue('refused');
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, reason: 'check' });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('says the service is unavailable, not that the visitor failed, when the spam check cannot run', async () => {
    deps.verifyTurnstile.mockResolvedValue('unavailable');
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, reason: 'unavailable' });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('limits sends per address, counting only enquiries that passed every check', async () => {
    deps.allowSend.mockResolvedValue(false);
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, reason: 'busy' });
    expect(deps.sendEmail).not.toHaveBeenCalled();
    await handleEnquiry(post({ ...GOOD, phone: '12' }, true), CONFIG, deps);
    expect(deps.allowSend).toHaveBeenCalledTimes(1);
  });

  it('says so when the email cannot be sent', async () => {
    deps.sendEmail.mockRejectedValue(new Error('smtp down for owner@example.com'));
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'email' });
  });

  it('pretends a honeypot post went through and sends nothing', async () => {
    const response = await handleEnquiry(post({ ...GOOD, website: 'http://spam.example' }), CONFIG, deps);
    expect([response.status, response.headers.get('location')]).toEqual([303, '/thanks/']);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('refuses other methods and oversized bodies, by header, by size, or streamed without a length', async () => {
    expect((await handleEnquiry(new Request('https://rivrpro.com/api/enquiry'), CONFIG, deps)).status).toBe(405);
    const byHeader = await handleEnquiry(post(GOOD, true, { 'content-length': '50000' }), CONFIG, deps);
    expect(byHeader.status).toBe(413);
    const bySize = await handleEnquiry(post({ ...GOOD, message: 'x'.repeat(30_000) }, true), CONFIG, deps);
    expect(bySize.status).toBe(413);
    const streamed = await handleEnquiry(chunked(5_000_000), CONFIG, deps);
    expect(streamed.status).toBe(413);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });
});
