"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export function AddButton({ productId, variantId, label, disabled }: { productId: string; variantId?: string | null; label: string; disabled?: boolean }) {
  const cart = useCart();
  const [done, setDone] = useState(false);
  return (
    <button
      className="add"
      type="button"
      disabled={disabled}
      onClick={() => {
        cart.add(productId, variantId);
        setDone(true);
        window.setTimeout(() => setDone(false), 900);
      }}
    >
      {done ? "✓" : label}
    </button>
  );
}
