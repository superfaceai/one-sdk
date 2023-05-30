import { SuperfaceClient, PerformError } from '@superfaceai/one-sdk/cloudflare';

import { COMLINK_IMPORTS } from './comlink';

const client = new SuperfaceClient({
  env: {
    SF_LOG: 'trace',
    SF_CONFIG_CACHE_DURATION: '10'
  },
  assetsPath: 'superface',
  preopens: { ...COMLINK_IMPORTS }
});

type Env = {
  TWILIO_ACCOUNT_SID: string,
  TWILIO_AUTH_TOKEN: string,
  MAILCHIMP_API_KEY: string
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: unknown // ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const to = url.searchParams.get('to') ?? '';
    const text = url.searchParams.get('text') ?? 'Hello world!';

    let result: Promise<unknown>;
    switch (url.pathname) {
      case '/sms':
        result = (await client.getProfile('communication/send-sms')).getUseCase('SendMessage').perform(
          { to, text },
          {
            provider: 'twilio',
            parameters: { from: '+16813666656', TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID },
            security: {
              basic: {
                username: env.TWILIO_ACCOUNT_SID,
                password: env.TWILIO_AUTH_TOKEN
              }
            }
          }
        );
        break

      case '/email':
        result = (await client.getProfile('communication/send-email')).getUseCase('SendEmail').perform(
          { from: 'cfw@demo.superface.org', to, text, subject: 'Superface on Cloudflare Workers' },
          {
            provider: 'mailchimp',
            security: {
              api_key: {
                apikey: env.MAILCHIMP_API_KEY
              }
            }
          }
        );
        break;

      default:
        return new Response(`Path ${url.pathname} not found`, { status: 404 });
    }

    try {
      // result as defined in the profile
      const ok = await result;
      return new Response(`Result: ${JSON.stringify(ok)}`);
    } catch (error) {
      if (error instanceof PerformError) {
        // error as defined in the profile
        const err = error.errorResult as { title: string, detail: string };
        return new Response(`${err.title}\n${err.detail}`, { status: 400 });
      } else {
        // exception - should not be part of a normal flow
        return new Response(`${error.name}\n${error.message}`, { status: 500 });
      }
    }
  }
};
