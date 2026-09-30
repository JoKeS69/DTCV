import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Entry experience: unauthenticated visitors land on signup (CASE//NET identity).
 * Authenticated detectives continue to the cases command deck.
 */
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/cases");
  }
  redirect("/register");
}
