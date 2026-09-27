import { ProductGrid } from "@/components/projects/marlow/ProductGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marlow — storefront",
  description: "Direct-to-consumer concept storefront with a working cart.",
};

export default function MarlowHome() {
  return (
    <>
      <header className="marlow-hero">
        <p className="proj-tag">Goods for a quieter desk</p>
        <h1>Marlow</h1>
        <p>A small catalog, a real cart, and a clearly labeled demo checkout.</p>
      </header>
      <ProductGrid />
    </>
  );
}
