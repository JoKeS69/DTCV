export type CartLine = {
  slug: string;
  qty: number;
};

export const CART_STORAGE_KEY = "marlow-cart-v1";

export function clampQty(qty: number, max: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(max, Math.max(1, Math.floor(qty)));
}
