import { EmailMessage } from 'cloudflare:email';
import { handleEnquiry } from './handler';
import { verifyTurnstile } from './turnstile';

// Where Turnstile's test keys may be used: local runs (wrangler dev, the e2e suite).
const LOCAL = new Set(['localhost', '127.0.0.1']);

/** The site: prebuilt pages from ASSETS, and the partner enquiry endpoint. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/enquiry' || url.pathname === '/api/enquiry/') {
      return handleEnquiry(request, env, {
        verifyTurnstile: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip, url.hostname, fetch, LOCAL.has(url.hostname)),
        allowSend: async (ip) => (await env.ENQUIRY_LIMIT.limit({ key: ip })).success,
        // Locally, wrangler's simulator checks the message as Cloudflare does and keeps it on disk.
        sendEmail: async (email) => { await env.EMAIL.send(new EmailMessage(email.from, email.to, email.raw)); },
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
