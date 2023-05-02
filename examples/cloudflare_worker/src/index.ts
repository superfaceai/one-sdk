import { Client } from '@superfaceai/one-sdk-cloudflare';

import { GRID_IMPORTS } from './grid';

const client = new Client({
  preopens: { ...GRID_IMPORTS }
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

    let result: { Err: { title: string, detail?: string } } | { Ok: { messageId: string } };
    switch (url.pathname) {
      case '/sms':
        result = await client.perform(
          'communication/send-sms',
          'twilio',
          'sendSms',
          { to, text },
          { from: '+16813666656', TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID },
          {
            basic: {
              username: env.TWILIO_ACCOUNT_SID,
              password: env.TWILIO_AUTH_TOKEN
            }
          }
        );
        break
      
      case '/email':
        result = await client.perform(
          'communication/send-email',
          'mailchimp',
          'sendEmail',
          { from: 'cfw@demo.superface.org', to, text, subject: 'Superface on Cloudflare Workers' },
          {},
          {
            api_key: {
              apikey: env.MAILCHIMP_API_KEY
            }
          }
        );
        break;
      
      default:
        return new Response(`Path ${url.pathname} not found`, { status: 404 });
    }

    if ('Err' in result) {
      const err = result['Err'];
      return new Response(`${err.title}\n${err.detail}`, { status: 500 });
    }

    const ok = result['Ok'];
    return new Response(`Result: ${JSON.stringify(ok)}`);
  },
};
