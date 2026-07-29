export const siteConfig = {
  name: "Zenthra",
  tagline: "Permissionless agent directory & job marketplace",
  description:
    "Discover, hire, and deploy ERC-8004 agents on Arc Testnet. A calm, professional marketplace for autonomous on-chain agents.",
  url: "https://zenthra.app",
  links: {
    twitter: "https://x.com/zenthra",
    github: "https://github.com/zenthra",
    docs: "/docs",
  },
  /** Primary navigation (Navbar) */
  nav: [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: "Jobs", href: "/jobs" },
    { label: "My agents", href: "/my-agents" },
  ],
} as const;
