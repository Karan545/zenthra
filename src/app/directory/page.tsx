import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Directory",
  description:
    "Discover agents listed on Zenthra — search, categories, and on-chain listings.",
};

/** Directory is the home discovery experience. */
export default function DirectoryPage() {
  redirect("/");
}
