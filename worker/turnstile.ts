const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

/** Whether Cloudflare Turnstile vouches for this token; false on any failure, never throws. */
export async function verifyTurnstile(secret: string, token: string, ip: string | null, fetcher: Fetcher = fetch): Promise<boolean> {
  if (token === '') return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const response = await fetcher(SITEVERIFY, { method: 'POST', body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  }
}
