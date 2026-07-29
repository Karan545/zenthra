"use client";

import { siteConfig } from "@/config/site";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isNavActive(pathname: string, href: string) {
  if (href.startsWith("/#") || href.startsWith("#")) {
    return false;
  }
  if (href === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/category") ||
      pathname.startsWith("/directory")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className={cn(
          "page-container transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "pt-3 sm:pt-4" : "pt-0"
        )}
      >
        <div
          className={cn(
            "relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            scrolled
              ? cn(
                  "border border-[#e8e2d9]/80 bg-[#F7F4EF]/72 shadow-[0_8px_32px_rgba(26,26,26,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#F7F4EF]/55",
                  /* Full pill when closed; softer capsule when mobile menu expands */
                  mobileOpen ? "rounded-3xl" : "rounded-full"
                )
              : "rounded-none border border-transparent bg-background/80 backdrop-blur-sm"
          )}
        >
          <nav
            className={cn(
              "flex h-16 items-center justify-between transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              scrolled ? "px-4 sm:px-6" : "px-0"
            )}
            aria-label="Main"
          >
            <Link href="/" className="flex items-center gap-2.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#e8e2d9] bg-white shadow-soft-sm">
                <Image
                  src="/photos/zenthralogo.jpg"
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                  priority
                />
              </span>
              {/* Same display face as hero headlines (Instrument Serif) */}
              <span className="font-display text-[1.35rem] leading-none tracking-[-0.02em] text-headline sm:text-[1.45rem]">
                {siteConfig.name}
              </span>
            </Link>

            <div className="hidden items-center gap-0.5 md:flex">
              {siteConfig.nav.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-[13.5px] transition-colors duration-200",
                      active
                        ? "font-medium text-foreground"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden items-center md:flex">
              <ConnectWallet size="sm" />
            </div>

            <button
              type="button"
              className={cn(
                "md:hidden -mr-1 rounded-full p-2 text-muted hover:bg-black/[0.03] hover:text-foreground",
                scrolled && "mr-0"
              )}
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X size={20} strokeWidth={1.75} />
              ) : (
                <Menu size={20} strokeWidth={1.75} />
              )}
            </button>
          </nav>

          <AnimatePresence>
            {mobileOpen ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={cn(
                  "overflow-hidden border-t border-border md:hidden",
                  scrolled
                    ? "mx-3 mb-3 rounded-2xl border border-border bg-[#F7F4EF]/95 backdrop-blur-xl"
                    : "border-border bg-background-warm"
                )}
              >
                <div className="flex flex-col gap-0.5 px-3 py-3 sm:px-4">
                  {siteConfig.nav.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "rounded-xl px-3 py-3 text-sm transition-colors",
                          active
                            ? "bg-black/[0.03] font-medium text-foreground"
                            : "text-muted hover:bg-black/[0.03] hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="my-2 h-px bg-border" />
                  <div className="pb-1">
                    <ConnectWallet size="md" fullWidth />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Soft bottom fade when not in pill mode so content doesn’t clash */}
      {!scrolled ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/60"
          aria-hidden
        />
      ) : null}
    </header>
  );
}
