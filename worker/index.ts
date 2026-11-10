import { EmailMessage } from 'cloudflare:email';
import { handleEnquiry } from './handler';
import { verifyTurnstile } from './turnstile';

/** The site: prebuilt pages from ASSETS, and the partner enquiry endpoint. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/enquiry' || url.pathname === '/api/enquiry/') {
      return handleEnquiry(request, env, {
        verifyTurnstile: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip),
        sendEmail: async (email) => {
          // Local runs and CI: log instead of sending.
          if (env.EMAIL_FAKE === '1') {
            console.log(`fake email to ${email.to}, ${email.raw.length} bytes`);
            return;
          }
          await env.EMAIL.send(new EmailMessage(email.from, email.to, email.raw));
        },
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
