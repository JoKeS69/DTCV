export type MarlowProduct = {
  slug: string;
  name: string;
  price: number;
  category: string;
  description: string;
  details: string[];
  inventory: number;
  accent: string;
};

export const marlowProducts: MarlowProduct[] = [
  {
    slug: "cedar-desk-tray",
    name: "Cedar desk tray",
    price: 68,
    category: "Desktop",
    description: "A solid cedar tray that keeps daily tools in one place without looking like office surplus.",
    details: ["Solid cedar, oiled finish", "240 × 160 mm", "Ships in 2–4 days"],
    inventory: 18,
    accent: "#8a5a3c",
  },
  {
    slug: "linen-task-lamp",
    name: "Linen task lamp",
    price: 142,
    category: "Lighting",
    description: "A compact lamp with a linen shade and a warm 2700K bulb — built for evening desk work.",
    details: ["Dimmable", "E12 socket", "Powder-coated steel"],
    inventory: 9,
    accent: "#c4b49a",
  },
  {
    slug: "wool-lap-blanket",
    name: "Wool lap blanket",
    price: 96,
    category: "Textile",
    description: "A merino throw sized for a sofa or a long flight, not a decorative leftover.",
    details: ["100% merino", "120 × 80 cm", "Dry clean"],
    inventory: 14,
    accent: "#6b5e52",
  },
  {
    slug: "stoneware-mug",
    name: "Stoneware mug",
    price: 32,
    category: "Kitchen",
    description: "A 350 ml mug with a thick wall that holds heat without scalding your hand.",
    details: ["Handmade glaze", "Dishwasher safe", "Made in small batches"],
    inventory: 40,
    accent: "#7a7468",
  },
  {
    slug: "canvas-weekender",
    name: "Canvas weekender",
    price: 188,
    category: "Bags",
    description: "A structured canvas bag with a leather grip, sized for two nights away.",
    details: ["Waxed canvas", "Leather handles", "Laptop sleeve"],
    inventory: 7,
    accent: "#4a453e",
  },
  {
    slug: "brass-incense-holder",
    name: "Brass incense holder",
    price: 28,
    category: "Home",
    description: "A machined brass rest that does one job and does not tip over.",
    details: ["Solid brass", "Felted base", "Fits standard sticks"],
    inventory: 22,
    accent: "#b08d57",
  },
];

export function getProduct(slug: string): MarlowProduct | undefined {
  return marlowProducts.find((p) => p.slug === slug);
}

export function formatPrice(centsOrDollars: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    centsOrDollars,
  );
}
