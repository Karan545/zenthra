import type { Metadata } from "next";
import { DiscoverHome } from "@/components/discover/DiscoverHome";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.title,
  },
  description: siteConfig.description,
};

export default function HomePage() {
  return <DiscoverHome />;
}
