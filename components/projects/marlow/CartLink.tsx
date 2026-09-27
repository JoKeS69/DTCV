"use client";

import Link from "next/link";
import { useCart } from "@/components/projects/marlow/CartProvider";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/projects/marlow/cart" className="marlow-cart-link">
      Cart{ready && count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
