"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export type RevealSide = "left" | "right" | "bottom" | "fade";

interface SectionRevealProps {
  children: React.ReactNode;
  side?: RevealSide;
  className?: string;
  delay?: number;
  /** Viewport amount (0–1) required to trigger. */
  amount?: number;
}

/**
 * Lightweight scroll reveal — opacity + translate only.
 * Alternating left/right; shorter distance & duration on mobile.
 */
export function SectionReveal({
  children,
  side = "left",
  className,
  delay = 0,
  amount = 0.2,
}: SectionRevealProps) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const dist = isMobile ? 22 : 44;
  const duration = isMobile ? 0.4 : 0.55;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const initial =
    side === "left"
      ? { opacity: 0, x: -dist, y: 0 }
      : side === "right"
        ? { opacity: 0, x: dist, y: 0 }
        : side === "bottom"
          ? { opacity: 0, x: 0, y: Math.round(dist * 0.7) }
          : { opacity: 0, x: 0, y: 14 };

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-48px", amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
