/**
 * Discovery categories for Zenthra Directory.
 * Agents match a category when name, description, or capabilities
 * contain any of the category keywords (case-insensitive).
 */
export type CategoryDef = {
  slug: string;
  name: string;
  description: string;
  /** lucide-react icon name */
  icon: CategoryIconName;
  keywords: string[];
};

export type CategoryIconName =
  | "MessageSquare"
  | "PenLine"
  | "Image"
  | "Code2"
  | "Workflow"
  | "Mic"
  | "Clapperboard"
  | "BarChart3"
  | "Coins"
  | "GraduationCap"
  | "Megaphone"
  | "HeartPulse"
  | "Shield"
  | "FlaskConical";

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "chat-conversation",
    name: "Chat & Conversation",
    description: "Dialogue, support, and conversational agents.",
    icon: "MessageSquare",
    keywords: [
      "chat",
      "conversation",
      "dialogue",
      "support",
      "faq",
      "triage",
      "assistant",
      "messaging",
    ],
  },
  {
    slug: "writing-content",
    name: "Writing & Content",
    description: "Copy, docs, editing, and long-form content.",
    icon: "PenLine",
    keywords: [
      "writing",
      "content",
      "copy",
      "editing",
      "docs",
      "editorial",
      "blog",
      "brand",
      "summarization",
    ],
  },
  {
    slug: "image-design",
    name: "Image & Design",
    description: "Visuals, design ops, and creative assets.",
    icon: "Image",
    keywords: [
      "image",
      "design",
      "visual",
      "creative",
      "assets",
      "illustration",
      "ui",
      "brand",
    ],
  },
  {
    slug: "coding",
    name: "Coding & Developer Tools",
    description: "Code, tooling, and developer workflows.",
    icon: "Code2",
    keywords: [
      "code",
      "coding",
      "developer",
      "dev",
      "programming",
      "api",
      "sdk",
      "engineering",
      "debug",
    ],
  },
  {
    slug: "productivity",
    name: "Productivity & Workflow",
    description: "Ops, automation, and day-to-day efficiency.",
    icon: "Workflow",
    keywords: [
      "productivity",
      "workflow",
      "ops",
      "automation",
      "orchestration",
      "status",
      "routing",
      "matching",
      "jobs",
    ],
  },
  {
    slug: "voice-audio",
    name: "Voice & Audio",
    description: "Speech, podcasts, and audio production.",
    icon: "Mic",
    keywords: ["voice", "audio", "speech", "podcast", "tts", "transcription"],
  },
  {
    slug: "video-animation",
    name: "Video & Animation",
    description: "Motion, video edits, and animation agents.",
    icon: "Clapperboard",
    keywords: ["video", "animation", "motion", "film", "editing"],
  },
  {
    slug: "data-analytics",
    name: "Data & Analytics",
    description: "Metrics, charts, indexing, and insights.",
    icon: "BarChart3",
    keywords: [
      "data",
      "analytics",
      "charts",
      "metrics",
      "indexing",
      "search",
      "directory",
      "wallets",
    ],
  },
  {
    slug: "finance",
    name: "Finance & Crypto",
    description: "Treasury, markets, and on-chain finance.",
    icon: "Coins",
    keywords: [
      "finance",
      "crypto",
      "treasury",
      "defi",
      "markets",
      "trading",
      "signals",
      "yield",
      "payments",
      "usdc",
    ],
  },
  {
    slug: "education",
    name: "Education & Learning",
    description: "Tutoring, courses, and knowledge agents.",
    icon: "GraduationCap",
    keywords: [
      "education",
      "learning",
      "tutor",
      "course",
      "teach",
      "research",
      "notes",
      "policy",
    ],
  },
  {
    slug: "marketing",
    name: "Marketing & SEO",
    description: "Growth, campaigns, and discoverability.",
    icon: "Megaphone",
    keywords: [
      "marketing",
      "seo",
      "growth",
      "campaign",
      "brand",
      "content",
      "social",
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare & Wellness",
    description: "Health, wellness, and care workflows.",
    icon: "HeartPulse",
    keywords: [
      "health",
      "healthcare",
      "wellness",
      "medical",
      "fitness",
      "care",
    ],
  },
  {
    slug: "security-legal",
    name: "Security & Legal",
    description: "Security review, compliance, and legal ops.",
    icon: "Shield",
    keywords: [
      "security",
      "legal",
      "compliance",
      "review",
      "checklist",
      "audit",
      "policy",
    ],
  },
  {
    slug: "experimental",
    name: "Experimental & Research",
    description: "R&D, prototypes, and frontier agents.",
    icon: "FlaskConical",
    keywords: [
      "experimental",
      "research",
      "prototype",
      "lab",
      "r&d",
      "signals",
      "briefs",
    ],
  },
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategorySlugs(): string[] {
  return CATEGORIES.map((c) => c.slug);
}
