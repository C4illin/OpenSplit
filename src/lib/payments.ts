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
  isAvailable: (payee: UsersResponse, currency: string) => boolean;
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

export const swish: PaymentMethod = {
  id: "swish",
  name: "Swish",
  isAvailable: (payee, currency) => !!payee.swish && currency.toUpperCase() === "SEK",
  buildUrl: (ctx) => (ctx.callbackUrl ? buildSwishAppSwitchUrl(ctx) : buildSwishWebUrl(ctx)),
};

export const paymentMethods: PaymentMethod[] = [swish];

export function availableMethods(payee: UsersResponse, currency: string) {
  return paymentMethods.filter((m) => m.isAvailable(payee, currency));
}
