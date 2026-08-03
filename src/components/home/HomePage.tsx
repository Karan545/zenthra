"use client";

import { Erc8004Section } from "@/components/home/Erc8004Section";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HowZenthraWorksSection } from "@/components/home/HowZenthraWorksSection";
import { JobsTeaserSection } from "@/components/home/JobsTeaserSection";
import { ProblemSection } from "@/components/home/ProblemSection";
import { ReputationSection } from "@/components/home/ReputationSection";

/**
 * Premium educational homepage — introduction to Zenthra.
 * Agent discovery lives at /directory.
 */
export function HomePage() {
  return (
    <div className="bg-background">
      <HomeHero />
      <ProblemSection />
      <Erc8004Section />
      <HowZenthraWorksSection />
      <FeaturesSection />
      <ReputationSection />
      <JobsTeaserSection />
      <FinalCtaSection />
    </div>
  );
}
