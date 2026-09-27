import Link from "next/link";
import { marlowProducts, formatPrice } from "@/lib/marlow-data";

export function ProductGrid() {
  return (
    <div className="product-grid">
      {marlowProducts.map((p) => (
        <Link key={p.slug} href={`/projects/marlow/product/${p.slug}`} className="product-card">
          <div className="swatch" style={{ background: p.accent }} />
          <p className="proj-tag">{p.category}</p>
          <h3>{p.name}</h3>
          <p>{formatPrice(p.price)}</p>
        </Link>
      ))}
    </div>
  );
}
