import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const HOST = 'rivrpro.com';

describe('verifyTurnstile', () => {
  it('passes when siteverify says success for this hostname, sending secret, token and IP', async () => {
    const fetcher = answer({ success: true, hostname: HOST });
    expect(await verifyTurnstile('secret', 'token', '203.0.113.9', HOST, fetcher)).toBe('passed');
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = init.body as FormData;
    expect([sent.get('secret'), sent.get('response'), sent.get('remoteip')]).toEqual(['secret', 'token', '203.0.113.9']);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses a failed check, a token made on another hostname, or no token', async () => {
    expect(await verifyTurnstile('s', 't', null, HOST, answer({ success: false, 'error-codes': ['invalid-input-response'] }))).toBe('refused');
    expect(await verifyTurnstile('s', 't', null, HOST, answer({ success: true, hostname: 'localhost' }))).toBe('refused');
    const fetcher = answer({ success: true, hostname: HOST });
    expect(await verifyTurnstile('s', '', null, HOST, fetcher)).toBe('refused');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts a test-key result only where test keys are allowed (local runs); elsewhere it means a misconfigured deploy', async () => {
    const testing = { success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } };
    expect(await verifyTurnstile('s', 't', null, 'localhost', answer(testing), true)).toBe('passed');
    expect(await verifyTurnstile('s', 't', null, HOST, answer(testing), false)).toBe('unavailable');
  });

  it('reports the check unavailable when siteverify is down or our secret is wrong, so visitors are not blamed', async () => {
    expect(await verifyTurnstile('s', 't', null, HOST, answer({}, 500))).toBe('unavailable');
    expect(await verifyTurnstile('s', 't', null, HOST, vi.fn(async () => { throw new Error('down'); }))).toBe('unavailable');
    expect(await verifyTurnstile('s', 't', null, HOST, answer({ success: false, 'error-codes': ['invalid-input-secret'] }))).toBe('unavailable');
    expect(await verifyTurnstile('s', 't', null, HOST, answer({ success: false, 'error-codes': ['missing-input-secret'] }))).toBe('unavailable');
  });
});
