import { CheckoutView } from "@/components/projects/marlow/CheckoutView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout — Marlow" };

export default function CheckoutPage() {
  return (
    <>
      <h1>Checkout</h1>
      <CheckoutView />
    </>
  );
}
