"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/projects/marlow/CartProvider";
import { formatPrice, getProduct } from "@/lib/marlow-data";

export function CheckoutView() {
  const { lines, ready, subtotal, clear } = useCart();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!ready) return <p className="demo-muted">Loading checkout…</p>;

  if (done) {
    return (
      <div className="marlow-empty">
        <p className="success-box show">Demo order placed. No payment was processed.</p>
        <Link href="/projects/marlow" className="cta-btn">
          Back to store
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="marlow-empty">
        <p>Nothing to check out.</p>
        <Link href="/projects/marlow" className="cta-btn">
          Shop products
        </Link>
      </div>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a name and a valid email to complete the demo checkout.");
      return;
    }
    setError("");
    clear();
    setDone(true);
  }

  return (
    <div className="checkout-grid">
      <form className="contact-form" onSubmit={onSubmit}>
        <p className="chip">Demo checkout — no payment is collected</p>
        <div>
          <label htmlFor="co-name">Name</label>
          <input id="co-name" name="name" required />
        </div>
        <div>
          <label htmlFor="co-email">Email</label>
          <input id="co-email" name="email" type="email" required />
        </div>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button type="submit" className="submit-btn">
          Place demo order · {formatPrice(subtotal)}
        </button>
      </form>
      <aside className="checkout-sum">
        <h2>Order summary</h2>
        <ul>
          {lines.map((l) => {
            const p = getProduct(l.slug);
            if (!p) return null;
            return (
              <li key={l.slug}>
                {p.name} × {l.qty}
                <span>{formatPrice(p.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        <p className="checkout-total">
          Total <strong>{formatPrice(subtotal)}</strong>
        </p>
      </aside>
    </div>
  );
}
