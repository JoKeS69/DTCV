import { FeaturedSections } from "@/components/home/FeaturedSections";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { UiPreview } from "@/components/home/UiPreview";

export default function HomePage() {
  return (
    <main id="top">
      <Hero />
      <FeaturedSections />
      <HowItWorks />
      <UiPreview />
    </main>
  );
}
