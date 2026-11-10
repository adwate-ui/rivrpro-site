import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('verifyTurnstile', () => {
  it('passes when siteverify says success, sending secret, token and IP', async () => {
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile('secret', 'token', '203.0.113.9', fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = init.body as FormData;
    expect([sent.get('secret'), sent.get('response'), sent.get('remoteip')]).toEqual(['secret', 'token', '203.0.113.9']);
  });

  it('fails on success false, an HTTP error, a network error or no token', async () => {
    expect(await verifyTurnstile('s', 't', null, answer({ success: false }))).toBe(false);
    expect(await verifyTurnstile('s', 't', null, answer({}, 500))).toBe(false);
    expect(await verifyTurnstile('s', 't', null, vi.fn(async () => { throw new Error('down'); }))).toBe(false);
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile('s', '', null, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
