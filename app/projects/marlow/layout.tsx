import { CartProvider } from "@/components/projects/marlow/CartProvider";
import { CartLink } from "@/components/projects/marlow/CartLink";
import { DemoChrome } from "@/components/projects/DemoChrome";

export default function MarlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DemoChrome product="Marlow" extra={<CartLink />}>
        <div className="marlow-page wrap">{children}</div>
      </DemoChrome>
    </CartProvider>
  );
}
