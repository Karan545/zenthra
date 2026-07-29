"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useSpring, useMotionValueEvent } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(
    `${prefix}${(0).toFixed(decimals)}${suffix}`
  );

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 22,
    mass: 0.9,
  });

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(`${prefix}${latest.toFixed(decimals)}${suffix}`);
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
