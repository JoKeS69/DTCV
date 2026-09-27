"use client";

import Link from "next/link";
import { useCart } from "@/components/projects/marlow/CartProvider";
import { formatPrice, getProduct } from "@/lib/marlow-data";

export function CartView() {
  const { lines, ready, setQty, remove, subtotal } = useCart();

  if (!ready) return <p className="demo-muted">Loading cart…</p>;
  if (lines.length === 0) {
    return (
      <div className="marlow-empty">
        <p>Your cart is empty.</p>
        <Link href="/projects/marlow" className="cta-btn">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="marlow-cart">
      <ul>
        {lines.map((line) => {
          const product = getProduct(line.slug);
          if (!product) return null;
          return (
            <li key={line.slug} className="cart-line">
              <div>
                <Link href={`/projects/marlow/product/${product.slug}`}>{product.name}</Link>
                <p>{formatPrice(product.price)} · {product.inventory} in stock</p>
              </div>
              <div className="cart-ops">
                <label>
                  Qty
                  <input
                    type="number"
                    min={1}
                    max={product.inventory}
                    value={line.qty}
                    onChange={(e) => setQty(line.slug, Number(e.target.value))}
                  />
                </label>
                <button type="button" className="ghost-btn" onClick={() => remove(line.slug)}>
                  Remove
                </button>
              </div>
              <strong>{formatPrice(product.price * line.qty)}</strong>
            </li>
          );
        })}
      </ul>
      <div className="cart-summary">
        <p>
          Subtotal <strong>{formatPrice(subtotal)}</strong>
        </p>
        <Link href="/projects/marlow/checkout" className="cta-btn">
          Checkout
        </Link>
      </div>
    </div>
  );
}
