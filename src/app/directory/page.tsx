import type { Metadata } from "next";
import { DiscoverHome } from "@/components/discover/DiscoverHome";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Directory",
  description:
    "Discover ERC-8004 agents listed on Zenthra. Search by skill, browse categories, and hire with on-chain identity on Arc Testnet.",
  openGraph: {
    title: `Directory · ${siteConfig.name}`,
    description:
      "Live on-chain agent listings from the Zenthra Curator on Arc Testnet.",
  },
};

/** Full agent discovery experience (search, categories, listings). */
export default function DirectoryPage() {
  return <DiscoverHome />;
}
