"use client";

import {
  BarChart3,
  Clapperboard,
  Code2,
  Coins,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Image,
  Megaphone,
  MessageSquare,
  Mic,
  PenLine,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconName } from "@/data/categories";

const ICONS: Record<CategoryIconName, LucideIcon> = {
  MessageSquare,
  PenLine,
  Image,
  Code2,
  Workflow,
  Mic,
  Clapperboard,
  BarChart3,
  Coins,
  GraduationCap,
  Megaphone,
  HeartPulse,
  Shield,
  FlaskConical,
};

export function CategoryIcon({
  name,
  size = 22,
  className,
}: {
  name: CategoryIconName;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[name] ?? MessageSquare;
  return <Icon size={size} strokeWidth={1.5} className={className} />;
}
