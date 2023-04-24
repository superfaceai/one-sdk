import { Client } from '@superfaceai/one-sdk-cloudflare';

// imports as ArrayBuffer - configured in wrangler.toml
// @ts-ignore
import profileData from '../grid/profile.supr';
// @ts-ignore
import mapData from '../grid/send-sms.tyntec.suma.js';

const client = new Client({
  preopens: {
    'grid/profile.supr': new Uint8Array(profileData),
    'grid/send-sms.suma.js': new Uint8Array(mapData)
  }
});

type Env = {
  TYNTEC_API_KEY: string
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: unknown // ExecutionContext
  ): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const to = params.get('to') ?? '';
    const message = params.get('message') ?? 'Hello world!';

    const result = await client.perform(
      'send-sms',
      { to, text: message },
      {
        vars: { from: 'tyntec' },
        secrets: { TYNTEC_API_KEY: env.TYNTEC_API_KEY }
      }
    );

    if ('Err' in result) {
      const err = result['Err'];
      return new Response(`${err.title}\n${err.detail}`, { status: 400 });
    }

    const ok = result['Ok'];
    return new Response(`Result: ${JSON.stringify(ok)}`);
  },
};
