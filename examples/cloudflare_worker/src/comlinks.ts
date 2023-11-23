// imports as ArrayBuffer - configured in wrangler.toml

// @ts-ignore
import profileSendEmail from '../superface/communication.send-email.profile'; // https://superface.ai/communication/send-sms@2.0.1
// @ts-ignore
import mapSendEmail from '../superface/communication.send-email.mailchimp.map.js';
// @ts-ignore
import providerMailchimp from '../superface/mailchimp.provider.json';

// @ts-ignore
import profileSendSms from '../superface/communication.send-sms.profile'; // https://superface.ai/communication/send-sms@2.0.1
// @ts-ignore
import mapSendSms from '../superface/communication.send-sms.twilio.map.js';
// @ts-ignore
import providerTwilio from '../superface/twilio.provider.json';

// @ts-ignore
import profileExample from '../superface/wasm-sdk.example.profile.ts';
// @ts-ignore
import mapExample from '../superface/wasm-sdk.example.localhost.map.js';
// @ts-ignore
import providerLocalhost from '../superface/localhost.provider.json';

export const COMLINK_IMPORTS = {
  'superface/communication.send-email.profile': new Uint8Array(profileSendEmail),
  'superface/communication.send-email.mailchimp.map.js': new Uint8Array(mapSendEmail),
  'superface/mailchimp.provider.json': new Uint8Array(providerMailchimp as any),
  'superface/communication.send-sms.profile': new Uint8Array(profileSendSms),
  'superface/communication.send-sms.twilio.map.js': new Uint8Array(mapSendSms),
  'superface/twilio.provider.json': new Uint8Array(providerTwilio as any),
  'superface/wasm-sdk.example.profile.ts': new Uint8Array(profileExample),
  'superface/wasm-sdk.example.localhost.map.js': new Uint8Array(mapExample),
  'superface/localhost.provider.json': new Uint8Array(providerLocalhost as any)
};
