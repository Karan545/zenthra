"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

type Drop = {
  id: number;
  left: string;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;
  flipDuration: number;
  flipDelay: number;
  startOne: boolean;
};

/** Deterministic PRNG so SSR/client match */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dense field of independent bit-droplets across the full hero.
 * Not matrix columns — each glyph is its own falling drop.
 */
function buildDrops(count: number): Drop[] {
  const rand = mulberry32(9001);
  const drops: Drop[] = [];

  for (let i = 0; i < count; i++) {
    // Even coverage with light organic jitter (no vertical rails)
    const col = i % 40;
    const row = Math.floor(i / 40);
    const baseX = ((col + 0.5) / 40) * 100;
    const x = Math.min(99.2, Math.max(0.4, baseX + (rand() - 0.5) * 2.8));

    drops.push({
      id: i,
      left: `${x.toFixed(2)}%`,
      // Spread start times so the field is always full
      delay: (rand() * 8 + row * 0.35 + col * 0.07) % 9,
      duration: 5.5 + rand() * 5.5,
      size: 10 + rand() * 5,
      opacity: 0.3 + rand() * 0.22,
      drift: (rand() - 0.5) * 36,
      flipDuration: 0.35 + rand() * 0.7,
      flipDelay: rand() * 1,
      startOne: rand() > 0.5,
    });
  }

  return drops;
}

/**
 * Professional binary rain: many scattered 0/1 droplets.
 * Soft center mask keeps headline/search readable without emptying the field.
 */
export function HeroBinaryRain() {
  const reduceMotion = useReducedMotion();
  // ~6 staggered “waves” of coverage across the hero
  const drops = useMemo(() => buildDrops(240), []);

  if (reduceMotion) return null;

  return (
    <div
      className="hero-binary-rain pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {drops.map((drop) => (
        <span
          key={drop.id}
          className="hero-binary-drop absolute font-mono tabular-nums leading-none"
          style={{
            left: drop.left,
            fontSize: `${drop.size}px`,
            color: `rgba(107, 84, 58, ${drop.opacity})`,
            animationDuration: `${drop.duration}s`,
            animationDelay: `-${drop.delay}s`, // negative = already mid-fall on load
            ["--drop-drift" as string]: `${drop.drift}px`,
          }}
        >
          <span
            className="hero-binary-bit relative inline-block"
            style={{ width: "1ch", height: "1em" }}
          >
            <span
              className={
                drop.startOne
                  ? "hero-binary-digit hero-binary-digit--one"
                  : "hero-binary-digit hero-binary-digit--zero"
              }
              style={{
                animationDuration: `${drop.flipDuration}s`,
                animationDelay: `${drop.flipDelay}s`,
              }}
            >
              0
            </span>
            <span
              className={
                drop.startOne
                  ? "hero-binary-digit hero-binary-digit--zero"
                  : "hero-binary-digit hero-binary-digit--one"
              }
              style={{
                animationDuration: `${drop.flipDuration}s`,
                animationDelay: `${drop.flipDelay}s`,
              }}
            >
              1
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
