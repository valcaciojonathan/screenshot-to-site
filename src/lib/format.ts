export const brl = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateBR = (d: string) => new Date(d).toLocaleDateString("pt-BR");
export const dateTimeBR = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const ORDER_STATUS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_aprovado: "Pagamento aprovado",
  em_preparacao: "Em preparação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  reembolsado: "Reembolsado",
  cancelado: "Cancelado",
};

export const PAYMENT_METHOD: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão de crédito",
  boleto: "Boleto",
};

export const FREE_SHIPPING_FROM = 299;
export const SHIPPING_FEE = 24.9;
/** Preview only — the server recalculates shipping when the order is placed. */
export const shippingFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

export const effectivePrice = (p: { price: number; promo_price: number | null }) =>
  Number(p.promo_price ?? p.price);

export const safeRedirect = (r: unknown) =>
  typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/";
