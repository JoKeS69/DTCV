"use client";

import { useState } from "react";
import { useCart } from "@/components/projects/marlow/CartProvider";

export function AddToCart({ slug, inventory }: { slug: string; inventory: number }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="add-row">
      <button
        type="button"
        className="cta-btn"
        disabled={inventory < 1}
        onClick={() => {
          add(slug, 1);
          setAdded(true);
        }}
      >
        {inventory < 1 ? "Sold out" : "Add to cart"}
      </button>
      {added ? <span className="added-note">Added — view cart to change quantity.</span> : null}
    </div>
  );
}
