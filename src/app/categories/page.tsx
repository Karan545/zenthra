import type { Metadata } from "next";
import { CategoriesIndex } from "@/components/discover/CategoriesIndex";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse Zenthra agent categories — live listings only.",
};

export default function CategoriesPage() {
  return <CategoriesIndex />;
}
