import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OutgoingEmail } from './email';
import { sendWithResend } from './resend';

const EMAIL: OutgoingEmail = {
  id: 'id-1', from: 'RIVR Pro <enquiries@rivrpro.com>', to: 'info@rivrpro.com', replyTo: 'asha@example.com',
  subject: 'Partner enquiry: Asha Verma, Jaipur (The RIVR system)', text: 'New partner enquiry',
};
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe('sendWithResend', () => {
  it('posts the email to Resend with the key, as JSON, keyed so a retry never sends twice', async () => {
    const fetcher = reply(200, { id: 'abc' });
    await sendWithResend('re_key', EMAIL, fetcher);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer re_key');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('idempotency-key')).toBe('id-1');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'RIVR Pro <enquiries@rivrpro.com>', to: ['info@rivrpro.com'], reply_to: 'asha@example.com',
      subject: 'Partner enquiry: Asha Verma, Jaipur (The RIVR system)', text: 'New partner enquiry',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws when Resend refuses, logging only the error name and status, never the message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetcher = reply(422, { name: 'validation_error', message: 'Invalid `reply_to` field: asha@example.com' });
    await expect(sendWithResend('re_key', EMAIL, fetcher)).rejects.toThrow('Resend refused: 422');
    expect(log).toHaveBeenCalledWith('resend refused', 422, 'validation_error');
    expect(JSON.stringify(log.mock.calls)).not.toContain('asha@example.com');
  });

  it('throws when Resend cannot be reached, and when no key is set', async () => {
    await expect(sendWithResend('re_key', EMAIL, vi.fn(async () => { throw new TypeError('network'); }))).rejects.toThrow();
    const fetcher = reply(200, { id: 'abc' });
    await expect(sendWithResend('', EMAIL, fetcher)).rejects.toThrow('RESEND_API_KEY is not set');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
