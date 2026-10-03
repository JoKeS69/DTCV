import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin · Sources" };

/** Source citation admin UI is hidden from all pages. */
export default function AdminSourcesPage() {
  redirect("/admin");
}
