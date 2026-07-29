"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsMobile, usePrefersReducedMotion } from "@/hooks/useMediaQuery";

type Drop = {
  id: number;
  left: string;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;
  bit: "0" | "1";
  flipDuration: number;
  flipDelay: number;
  startOne: boolean;
};

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDrops(count: number, mobile: boolean): Drop[] {
  const rand = mulberry32(mobile ? 4242 : 9001);
  const drops: Drop[] = [];
  const cols = mobile ? 14 : 28;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = ((col + 0.5) / cols) * 100;
    const x = Math.min(99.2, Math.max(0.4, baseX + (rand() - 0.5) * 3.2));

    drops.push({
      id: i,
      left: `${x.toFixed(2)}%`,
      delay: (rand() * 7 + row * 0.4 + col * 0.08) % 8,
      duration: (mobile ? 8 : 6) + rand() * (mobile ? 6 : 5),
      size: mobile ? 9 + rand() * 3 : 10 + rand() * 5,
      opacity: mobile ? 0.22 + rand() * 0.14 : 0.3 + rand() * 0.2,
      drift: (rand() - 0.5) * (mobile ? 18 : 36),
      bit: rand() > 0.5 ? "1" : "0",
      flipDuration: 0.4 + rand() * 0.8,
      flipDelay: rand() * 1,
      startOne: rand() > 0.5,
    });
  }

  return drops;
}

/**
 * Binary rain for the hero. Lightweight on mobile (fewer drops, no bit-flip
 * DOM animation, paused when tab hidden).
 */
export function HeroBinaryRain() {
  const isMobile = useIsMobile();
  const reduceMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);

  const dropCount = isMobile ? 48 : 160;
  const drops = useMemo(
    () => buildDrops(dropCount, isMobile),
    [dropCount, isMobile]
  );

  // Pause CSS animations when tab is hidden (big mobile battery/CPU win)
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (reduceMotion || !visible) return null;

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
            animationDelay: `-${drop.delay}s`,
            ["--drop-drift" as string]: `${drop.drift}px`,
          }}
        >
          {isMobile ? (
            // Static glyph on mobile — no dual-digit opacity flip per frame
            <span>{drop.bit}</span>
          ) : (
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
          )}
        </span>
      ))}
    </div>
  );
}
