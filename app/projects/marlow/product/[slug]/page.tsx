import { AddToCart } from "@/components/projects/marlow/AddToCart";
import { formatPrice, getProduct, marlowProducts } from "@/lib/marlow-data";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return marlowProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return { title: product ? `${product.name} — Marlow` : "Product — Marlow" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <article className="product-detail">
      <Link href="/projects/marlow" className="demo-muted">
        ← All products
      </Link>
      <div className="detail-grid">
        <div className="swatch large" style={{ background: product.accent }} />
        <div>
          <p className="proj-tag">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="price">{formatPrice(product.price)}</p>
          <p>{product.description}</p>
          <ul className="proj-feat">
            {product.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="demo-muted">{product.inventory} in stock (headless inventory seed)</p>
          <AddToCart slug={product.slug} inventory={product.inventory} />
        </div>
      </div>
    </article>
  );
}
