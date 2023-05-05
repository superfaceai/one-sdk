// imports as ArrayBuffer - configured in wrangler.toml

// @ts-ignore
import profileSendEmail from '../grid/communication.send-email.supr'; // https://superface.ai/communication/send-sms@2.0.1
// @ts-ignore
import mapSendEmail from '../grid/communication.send-email.mailchimp.suma.js';
// @ts-ignore
import providerMailchimp from '../grid/mailchimp.provider.json';

// @ts-ignore
import profileSendSms from '../grid/communication.send-sms.supr'; // https://superface.ai/communication/send-sms@2.0.1
// @ts-ignore
import mapSendSms from '../grid/communication.send-sms.twilio.suma.js';
// @ts-ignore
import providerTwilio from '../grid/twilio.provider.json';

export const GRID_IMPORTS = {
  'grid/communication.send-email.supr': new Uint8Array(profileSendEmail),
  'grid/communication.send-email.mailchimp.suma.js': new Uint8Array(mapSendEmail),
  'grid/mailchimp.provider.json': new Uint8Array(providerMailchimp as any),
  'grid/communication.send-sms.supr': new Uint8Array(profileSendSms),
  'grid/communication.send-sms.twilio.suma.js': new Uint8Array(mapSendSms),
  'grid/twilio.provider.json': new Uint8Array(providerTwilio as any),
};
