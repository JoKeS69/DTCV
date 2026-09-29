import { redirect } from "next/navigation";

/**
 * Final mockup homepage IS the command deck (cases HUD).
 * Brand: DETECTIVE. See media/desktop.jpeg + mobileversion.jpeg.
 */
export default function HomePage() {
  redirect("/cases");
}
