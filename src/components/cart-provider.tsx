"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = { productId: string; variantId: string | null; qty: number };

type CartValue = {
  items: CartLine[];
  add: (productId: string, variantId?: string | null) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  clear: () => void;
  tableCode: string;
  setTableCode: (code: string) => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [tableCode, setTableCode] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`tajer-cart-${slug}`);
    const table = sessionStorage.getItem(`tajer-table-${slug}`);
    if (stored) {
      try {
        setItems(JSON.parse(stored) as CartLine[]);
      } catch {
        setItems([]);
      }
    }
    if (table) setTableCode(table);
    setReady(true);
  }, [slug]);

  useEffect(() => {
    if (ready) localStorage.setItem(`tajer-cart-${slug}`, JSON.stringify(items));
  }, [items, ready, slug]);

  const value = useMemo<CartValue>(() => ({
    items,
    tableCode,
    setTableCode: (code) => {
      setTableCode(code);
      sessionStorage.setItem(`tajer-table-${slug}`, code);
    },
    add: (productId, variantId = null) => {
      setItems((current) => {
        const index = current.findIndex((item) => item.productId === productId && item.variantId === (variantId || null));
        if (index === -1) return [...current, { productId, variantId: variantId || null, qty: 1 }];
        return current.map((item, itemIndex) => itemIndex === index ? { ...item, qty: item.qty + 1 } : item);
      });
    },
    setQty: (productId, variantId, qty) => {
      setItems((current) => current.flatMap((item) => {
        if (item.productId !== productId || item.variantId !== variantId) return [item];
        if (qty <= 0) return [];
        return [{ ...item, qty }];
      }));
    },
    clear: () => setItems([]),
  }), [items, slug, tableCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("Cart missing");
  return value;
}
