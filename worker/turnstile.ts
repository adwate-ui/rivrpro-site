const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** `refused`: not a person, or a token made elsewhere. `unavailable`: the check could not run (siteverify down, our secret wrong). */
export type TurnstileVerdict = 'passed' | 'refused' | 'unavailable';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

// Error codes that mean our configuration is wrong, not the visitor.
const OUR_FAULT = ['missing-input-secret', 'invalid-input-secret'];

/**
 * Asks Cloudflare whether the token is good and was issued on `hostname`, the site serving the form. Turnstile's test
 * keys answer for example.com; their result counts only where `allowTestingKey` (local runs), and elsewhere means the
 * deploy has a test secret. Never throws; logs siteverify's error codes, which hold no personal data.
 */
export async function verifyTurnstile(
  secret: string, token: string, ip: string | null, hostname: string, fetcher: Fetcher = fetch, allowTestingKey = false,
): Promise<TurnstileVerdict> {
  if (token === '') return 'refused';
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const response = await fetcher(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return 'unavailable';
    const result = (await response.json()) as {
      success?: unknown; hostname?: unknown; 'error-codes'?: unknown; metadata?: { result_with_testing_key?: unknown };
    };
    if (result.metadata?.result_with_testing_key === true) {
      if (!allowTestingKey) console.error('turnstile: test secret in use outside a local run');
      return allowTestingKey && result.success === true ? 'passed' : 'unavailable';
    }
    if (result.success === true) return result.hostname === hostname ? 'passed' : 'refused';
    const codes = Array.isArray(result['error-codes']) ? result['error-codes'].map(String) : [];
    console.warn('turnstile refused', codes.join(','));
    return codes.some((code) => OUR_FAULT.includes(code)) ? 'unavailable' : 'refused';
  } catch {
    return 'unavailable';
  }
}
