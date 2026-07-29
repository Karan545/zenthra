"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover border border-transparent",
  secondary:
    "bg-transparent text-foreground border border-border-strong hover:border-headline hover:bg-white",
  ghost:
    "bg-transparent text-muted hover:text-foreground border border-transparent hover:bg-black/[0.03]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-7 text-[15px] rounded-xl gap-2 min-h-12",
};

const baseClass =
  "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  /** When set, renders as a Next.js Link with the same styles. */
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className, children, href, ...props },
    ref
  ) => {
    const classes = cn(baseClass, variants[variant], sizes[size], className);

    if (href) {
      return (
        <motion.div
          whileHover={{ y: -1 }}
          whileTap={{ y: 0, scale: 0.99 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex"
        >
          <Link href={href} className={classes}>
            {children}
          </Link>
        </motion.div>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ y: 0, scale: 0.99 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={classes}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
