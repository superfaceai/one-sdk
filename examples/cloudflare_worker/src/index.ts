import { Client } from '@superfaceai/one-sdk-cloudflare';

// imports as ArrayBuffer - configured in wrangler.toml
// @ts-ignore
import profileDataSms from '../grid/send-sms.supr'; // https://superface.ai/communication/send-sms@2.0.1
// @ts-ignore
import profileDataEmail from '../grid/send-email.supr'; // https://superface.ai/communication/send-email@2.1.0
// @ts-ignore
import mapDataSms from '../grid/send-sms.twilio.suma.js';
// @ts-ignore
import mapDataEmail from '../grid/send-email.mailchimp.suma.js';

const client = new Client({
  preopens: {
    'grid/send-sms.supr': new Uint8Array(profileDataSms),
    'grid/send-email.supr': new Uint8Array(profileDataEmail),
    'grid/send-sms.suma.js': new Uint8Array(mapDataSms),
    'grid/send-email.suma.js': new Uint8Array(mapDataEmail),
  }
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
          'send-sms',
          { to, text },
          {
            vars: { from: '+16813666656', TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID },
            secrets: { TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN }
          }
        );
        break
      
      case '/email':
        result = await client.perform(
          'send-email',
          { from: 'cfw@demo.superface.org', to, text, subject: 'Superface on Cloudflare Workers' },
          {
            secrets: { MAILCHIMP_API_KEY: env.MAILCHIMP_API_KEY }
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

// https://example.super-ela.workers.dev/sms?to=%2B421914261973&text=hi+from+edge
// https://console.twilio.com/us1/monitor/logs/sms

// https://example.super-ela.workers.dev/email?to=demo@demo.superface.org&text=well+hello+there
// https://mandrillapp.com/activity
