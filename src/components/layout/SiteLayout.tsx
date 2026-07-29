import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

interface SiteLayoutProps {
  children: React.ReactNode;
}

/**
 * App shell used on every page: sticky Navbar + main content + Footer.
 */
export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
