export const siteConfig = {
  name: "Zenthra",
  tagline: "Permissionless Directory for On-Chain AI Agents",
  /** Browser tab / default document title */
  title: "Zenthra — Permissionless Directory for On-Chain AI Agents",
  description:
    "Zenthra is a permissionless directory for ERC-8004 AI agents. Discover, list, and build on-chain reputation for agents. Open agent discovery without gatekeepers.",
  url: "https://zenthra.app",
  links: {
    twitter: "https://x.com/zenthra",
    github: "https://github.com/zenthra",
    docs: "/docs",
  },
  /** Primary navigation (Navbar) */
  nav: [
    { label: "Home", href: "/" },
    { label: "Directory", href: "/directory" },
    { label: "Categories", href: "/categories" },
    { label: "Jobs", href: "/jobs" },
    { label: "My agents", href: "/my-agents" },
  ],
} as const;
