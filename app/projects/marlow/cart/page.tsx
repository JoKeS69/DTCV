import { CartView } from "@/components/projects/marlow/CartView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cart — Marlow" };

export default function CartPage() {
  return (
    <>
      <h1>Cart</h1>
      <CartView />
    </>
  );
}
