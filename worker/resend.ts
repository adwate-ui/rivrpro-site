import type { OutgoingEmail } from './email';

const ENDPOINT = 'https://api.resend.com/emails';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Sends one email through Resend's REST API (owner, 12 Nov: Resend, not a paid Cloudflare plan). Throws on any failure,
 * so the enquiry form shows its WhatsApp fallback. Logs Resend's error name and status only: its messages can quote
 * the enquirer's address.
 */
export async function sendWithResend(apiKey: string, email: OutgoingEmail, fetcher: Fetcher = fetch): Promise<void> {
  if (apiKey === '') throw new Error('RESEND_API_KEY is not set');
  const response = await fetcher(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': email.id },
    body: JSON.stringify({ from: email.from, to: [email.to], reply_to: email.replyTo, subject: email.subject, text: email.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { name?: unknown };
    console.error('resend refused', response.status, typeof body.name === 'string' ? body.name : 'unknown');
    throw new Error(`Resend refused: ${response.status}`);
  }
}
