import type { Metadata } from "next";
import { DiscoverHome } from "@/components/discover/DiscoverHome";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — Agent directory`,
  },
  description:
    "Discover ERC-8004 agents listed on Zenthra. Search by skill, browse categories, and hire with on-chain identity on Arc Testnet.",
};

export default function HomePage() {
  return <DiscoverHome />;
}
