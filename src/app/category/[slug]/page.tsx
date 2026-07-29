import type { Metadata } from "next";
import { CategoryPageContent } from "@/components/discover/CategoryPageContent";
import { getCategoryBySlug, getCategorySlugs } from "@/data/categories";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  return {
    title: cat ? cat.name : "Category",
    description: cat?.description ?? "Browse agents in this category.",
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  return <CategoryPageContent slug={slug} />;
}
