import { Client } from '@superfaceai/one-sdk-cloudflare';

const client = new Client();

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: unknown // ExecutionContext
  ): Promise<Response> {
    const id = new URL(request.url).searchParams.get('id') ?? 1;
    const result = await client.perform('ExampleUsecaseImplementation', { id });

    return new Response(`Result: ${JSON.stringify(result)}`);
  },
};
