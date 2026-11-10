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

let deps: Deps & { sendEmail: ReturnType<typeof vi.fn>; verifyTurnstile: ReturnType<typeof vi.fn> };
beforeEach(() => {
  deps = {
    verifyTurnstile: vi.fn(async () => true),
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
    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(deps.sendEmail.mock.calls[0]![0]).toMatchObject({ from: 'enquiries@rivrpro.com', to: 'owner@example.com' });
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
    deps.verifyTurnstile.mockResolvedValue(false);
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, reason: 'check' });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('says so when the email cannot be sent', async () => {
    deps.sendEmail.mockRejectedValue(new Error('smtp down'));
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'email' });
  });

  it('pretends a honeypot post went through and sends nothing', async () => {
    const response = await handleEnquiry(post({ ...GOOD, website: 'http://spam.example' }), CONFIG, deps);
    expect([response.status, response.headers.get('location')]).toEqual([303, '/thanks/']);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('refuses other methods and oversized bodies, by header or by actual size', async () => {
    expect((await handleEnquiry(new Request('https://rivrpro.com/api/enquiry'), CONFIG, deps)).status).toBe(405);
    const byHeader = await handleEnquiry(post(GOOD, true, { 'content-length': '50000' }), CONFIG, deps);
    expect(byHeader.status).toBe(413);
    const bySize = await handleEnquiry(post({ ...GOOD, message: 'x'.repeat(30_000) }, true), CONFIG, deps);
    expect(bySize.status).toBe(413);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });
});
