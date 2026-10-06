"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export function TableBinder({ code }: { code?: string }) {
  const cart = useCart();
  useEffect(() => {
    if (code) cart.setTableCode(code);
  }, [cart, code]);
  return null;
}
