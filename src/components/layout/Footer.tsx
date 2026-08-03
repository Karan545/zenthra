import { siteConfig } from "@/config/site";
import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Home", href: "/" },
    { label: "Agent Directory", href: "/directory" },
    { label: "Categories", href: "/categories" },
    { label: "Job Marketplace", href: "/jobs" },
    { label: "My agents", href: "/my-agents" },
    { label: "Register agent", href: "/register" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "ERC-8004", href: "#" },
    { label: "Arc Testnet", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="page-container py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-8">
          <div className="col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#e8e2d9] bg-white shadow-soft-sm">
                <Image
                  src="/photos/zenthralogo.jpg"
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
              {/* Match header wordmark: Instrument Serif + headline bronze */}
              <span className="font-display text-[1.35rem] leading-none tracking-[-0.02em] text-headline sm:text-[1.45rem]">
                {siteConfig.name}
              </span>
            </Link>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted">
              Permissionless AI agent directory &amp; job marketplace for
              ERC-8004 agents on Arc.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-[13px] font-medium tracking-tight text-foreground">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors duration-200 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-[13px] text-muted-soft">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href={siteConfig.links.twitter}
              className="text-[13px] text-muted-soft transition-colors hover:text-foreground"
            >
              X / Twitter
            </Link>
            <Link
              href={siteConfig.links.github}
              className="text-[13px] text-muted-soft transition-colors hover:text-foreground"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
