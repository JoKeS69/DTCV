import { DemoChrome } from "@/components/projects/DemoChrome";
import { BookingFlow } from "@/components/projects/fieldwork/BookingFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fieldwork — appointment scheduling",
  description: "Booking flow with conflict-free staff calendars.",
};

export default function FieldworkPage() {
  return (
    <DemoChrome product="Fieldwork">
      <BookingFlow />
    </DemoChrome>
  );
}
