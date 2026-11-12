import { handleEnquiry } from './handler';
import { sendWithResend } from './resend';
import { verifyTurnstile } from './turnstile';

// Local runs (wrangler dev, the e2e suite): Turnstile's test keys are allowed, and with no Resend key the email is
// logged instead of sent. Anywhere else a missing key fails the send, and the form shows its WhatsApp fallback.
const LOCAL = new Set(['localhost', '127.0.0.1']);

/** The site: prebuilt pages from ASSETS, and the partner enquiry endpoint. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const isLocal = LOCAL.has(url.hostname);
    if (url.pathname === '/api/enquiry' || url.pathname === '/api/enquiry/') {
      return handleEnquiry(request, env, {
        verifyTurnstile: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip, url.hostname, fetch, isLocal),
        allowSend: async (ip) => (await env.ENQUIRY_LIMIT.limit({ key: ip })).success,
        sendEmail: async (email) => {
          if (isLocal && !env.RESEND_API_KEY) {
            console.log(`dry run: email to ${email.to}, ${email.text.length} characters`);
            return;
          }
          await sendWithResend(env.RESEND_API_KEY ?? '', email);
        },
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
