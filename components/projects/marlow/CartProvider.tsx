"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct } from "@/lib/marlow-data";
import { CART_STORAGE_KEY, clampQty, type CartLine } from "@/lib/marlow-cart";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function parseStored(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        if (typeof rec.slug !== "string" || typeof rec.qty !== "number") return null;
        const product = getProduct(rec.slug);
        if (!product) return null;
        return { slug: rec.slug, qty: clampQty(rec.qty, product.inventory) };
      })
      .filter((x): x is CartLine => x !== null);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(parseStored(localStorage.getItem(CART_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((slug: string, qty = 1) => {
    const product = getProduct(slug);
    if (!product) return;
    setLines((cur) => {
      const existing = cur.find((l) => l.slug === slug);
      if (!existing) return [...cur, { slug, qty: clampQty(qty, product.inventory) }];
      return cur.map((l) =>
        l.slug === slug ? { ...l, qty: clampQty(l.qty + qty, product.inventory) } : l,
      );
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const product = getProduct(slug);
    if (!product) return;
    setLines((cur) =>
      cur.map((l) => (l.slug === slug ? { ...l, qty: clampQty(qty, product.inventory) } : l)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((cur) => cur.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = getProduct(l.slug);
      return p ? sum + p.price * l.qty : sum;
    }, 0);
    const count = lines.reduce((n, l) => n + l.qty, 0);
    return { lines, ready, add, setQty, remove, clear, count, subtotal };
  }, [lines, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
