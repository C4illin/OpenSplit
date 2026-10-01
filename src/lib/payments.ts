import { currencyDecimals } from "@/lib/currencies";
import type { UsersResponse } from "@/types/pocketbase-types.gen";

export type PaymentContext = {
  payee: UsersResponse;
  amount: number;
  currency: string;
  message: string;
  // When set, Swish app-switches back to this URL after the user finishes,
  // appending `?result=...`. Note: the result is an app-return signal, not a
  // verified payment confirmation, so callers must treat it as optimistic.
  callbackUrl?: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  buttonLabel?: string;
  isAvailable: (payee: UsersResponse, payer: UsersResponse | null) => boolean;
  targetCurrencies: (string | null)[];
  buildUrl: (ctx: PaymentContext) => string;
};

// Swish permits letters (a-ö/A-Ö), digits and the special characters ! ? ( ) , . - : ; .
// See https://developer.swish.nu/api/payment-request/v1
function sanitizeSwishMessage(message: string) {
  return message
    .replace(/[^0-9A-Za-zÅÄÖåäö !?(),.:;-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

// Undocumented Swish app-switch deep link (the documented merchant flow is
// token-based and requires a merchant agreement + certificate). It locks the
// amount and supports a return callback, which the documented web link does
// not. Falls back to the web link when no callback URL is available (e.g. when
// app-switching isn't possible).
function buildSwishAppSwitchUrl({ payee, amount, message, callbackUrl }: PaymentContext) {
  const data = {
    version: 1,
    payee: { value: payee.swish },
    amount: { value: Number(amount.toFixed(2)), editable: false },
    message: { value: sanitizeSwishMessage(message) },
  };
  // Encode with encodeURIComponent (not URLSearchParams) to match the working
  // app-switch link format: spaces become %20 and "+" becomes %2B, rather than
  // URLSearchParams' form-encoding where spaces become "+" (which Swish would
  // then read as a literal plus inside the message).
  const parts = [`data=${encodeURIComponent(JSON.stringify(data))}`];
  if (callbackUrl) {
    parts.push(`callbackurl=${encodeURIComponent(callbackUrl)}`);
    parts.push("callbackresultparameter=result");
  }
  return `swish://payment?${parts.join("&")}`;
}

function buildSwishWebUrl({ payee, amount, message }: PaymentContext) {
  const params = [
    `sw=${encodeURIComponent(payee.swish)}`,
    `amt=${amount.toFixed(2)}`,
    `cur=SEK`,
    `msg=${encodeURIComponent(sanitizeSwishMessage(message))}`,
    `src=qr`,
  ];
  return `https://app.swish.nu/1/p/sw/?${params.join("&")}`;
}

export function sanitizeRevolutTag(tag: string) {
  let cleaned = tag.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?revolut\.me\//i, "");
  cleaned = cleaned.replace(/^revolut\.me\//i, "");
  cleaned = cleaned.replace(/^[@/]+/, "");
  return cleaned.split(/[?#/]/)[0].trim();
}

function sanitizeRevolutNote(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 64);
}

function buildRevolutUrl({ payee, amount, currency, message }: PaymentContext) {
  const tag = sanitizeRevolutTag(payee.revolut ?? "");
  const decimals = currencyDecimals(currency.toLowerCase());
  const minorAmount = Math.max(0, Math.round(amount * Math.pow(10, decimals)));
  const note = sanitizeRevolutNote(message);
  const params = [
    `currency=${encodeURIComponent(currency.toUpperCase())}`,
    `amount=${minorAmount}`,
    `note=${encodeURIComponent(note)}`,
  ];
  return `https://revolut.me/${encodeURIComponent(tag)}?${params.join("&")}`;
}

export const swish: PaymentMethod = {
  id: "swish",
  name: "Swish",
  isAvailable: (payee) => !!payee.swish,
  targetCurrencies: ["sek"],
  buildUrl: (ctx) => (ctx.callbackUrl ? buildSwishAppSwitchUrl(ctx) : buildSwishWebUrl(ctx)),
};

export const revolut: PaymentMethod = {
  id: "revolut",
  name: "Revolut",
  buttonLabel: "Pay with Revolut (Card / Apple Pay)",
  isAvailable: (payee) => !!payee.revolut && !!sanitizeRevolutTag(payee.revolut),
  targetCurrencies: [null],
  buildUrl: buildRevolutUrl,
};

export function removePlusInPhoneNumber(phone: string): string {
  return phone.replace(/^\+/, "").replace(/\D/g, "");
}

export const vipps: PaymentMethod = {
  id: "vipps",
  name: "Vipps",
  isAvailable: (payee, payer) => {
    if (!payee.vipps && !payee.mobilepay) return false;
    if (payer) {
      if (payer.vipps) return true;
      if (payer.mobilepay) return false;
    }
    return !!payee.vipps;
  },
  targetCurrencies: ["nok"],
  buildUrl: ({ payee }) => {
    const raw = payee.vipps || payee.mobilepay || "";
    const phone = removePlusInPhoneNumber(raw);
    return `https://qr.vipps.no/28/2/01/031/${phone}?v=1`;
  },
};

function getMobilePayDomain(currency: string, phone: string): string {
  if (currency.toLowerCase() === "eur" || phone.startsWith("358")) {
    return "qr.mobilepay.fi";
  }
  return "qr.mobilepay.dk";
}

export const mobilepay: PaymentMethod = {
  id: "mobilepay",
  name: "MobilePay",
  isAvailable: (payee, payer) => {
    if (!payee.vipps && !payee.mobilepay) return false;
    if (payer) {
      if (payer.mobilepay) return true;
      if (payer.vipps) return false;
    }
    return !!payee.mobilepay;
  },
  targetCurrencies: ["dkk", "eur"],
  buildUrl: ({ payee, currency }) => {
    const raw = payee.mobilepay || payee.vipps || "";
    const phone = removePlusInPhoneNumber(raw);
    const domain = getMobilePayDomain(currency, phone);
    return `https://${domain}/28/2/01/031/${phone}?v=1`;
  },
};

export const paymentMethods: PaymentMethod[] = [swish, revolut, vipps, mobilepay];

export function availableMethods(payee: UsersResponse, payer: UsersResponse | null = null) {
  return paymentMethods.filter((m) => m.isAvailable(payee, payer));
}
