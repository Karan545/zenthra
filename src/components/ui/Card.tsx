"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({
  children,
  className,
  hover = true,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -3,
              transition: { duration: 0.25, ease: "easeOut" },
            }
          : undefined
      }
      className={cn(
        "card-surface rounded-2xl p-6 sm:p-7 transition-[box-shadow,border-color] duration-300",
        hover && "hover:shadow-soft-md hover:border-border-strong",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
