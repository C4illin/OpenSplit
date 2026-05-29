import type { UsersResponse } from "@/types/pocketbase-types.gen";

export type PaymentContext = {
  payee: UsersResponse;
  amount: number;
  currency: string;
  message: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  isAvailable: (payee: UsersResponse, currency: string) => boolean;
  buildUrl: (ctx: PaymentContext) => string;
};

export const swish: PaymentMethod = {
  id: "swish",
  name: "Swish",
  isAvailable: (payee, currency) => !!payee.swish && currency.toUpperCase() === "SEK",
  buildUrl: ({ payee, amount, message }) => {
    const params = new URLSearchParams({
      sw: payee.swish,
      amt: amount.toFixed(2),
      cur: "SEK",
      msg: message,
      edit: "amt,msg",
    });
    return `https://app.swish.nu/1/p/sw/?${params.toString()}`;
  },
};

export const paymentMethods: PaymentMethod[] = [swish];

export function availableMethods(payee: UsersResponse, currency: string) {
  return paymentMethods.filter((m) => m.isAvailable(payee, currency));
}
