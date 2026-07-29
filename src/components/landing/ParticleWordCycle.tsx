"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";

/** Loop order (exact) */
export const HERO_LOOP_WORDS = ["work", "earn", "scale", "matter"] as const;

const HOLD_MS = 2400;
const DISSOLVE_MS = 820;
const REFORM_MS = 980;
const PARTICLES_PER_LETTER = 9;
const PARTICLES_PER_LETTER_MOBILE = 3;

/** Soft bronze / cream — matches headline design system */
const PARTICLE_COLORS = [
  "#8b6f4e",
  "#a68b6a",
  "#6f563c",
  "#c4a882",
  "#9a7f5c",
  "#d4c4a8",
];

const EASE = [0.22, 1, 0.36, 1] as const;

type Phase = "visible" | "dissolving" | "reforming";

type Particle = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  delay: number;
  color: string;
  duration: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickColor() {
  return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!;
}

function letterCenters(
  letterEls: Array<HTMLElement | null>,
  container: HTMLElement
): Array<{ x: number; y: number }> {
  const cRect = container.getBoundingClientRect();
  return letterEls
    .filter((el): el is HTMLElement => Boolean(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cRect.left + r.width / 2,
        y: r.top - cRect.top + r.height / 2,
      };
    });
}

function scatterParticles(
  centers: Array<{ x: number; y: number }>,
  perLetter = PARTICLES_PER_LETTER
): Particle[] {
  const out: Particle[] = [];
  centers.forEach((c, li) => {
    for (let i = 0; i < perLetter; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(32, 88);
      out.push({
        id: `s-${li}-${i}-${Math.random().toString(36).slice(2, 9)}`,
        fromX: c.x + rand(-2, 2),
        fromY: c.y + rand(-3, 3),
        toX: c.x + Math.cos(angle) * dist,
        toY: c.y + Math.sin(angle) * dist - rand(6, 28),
        size: rand(1.5, 3.4),
        delay: li * 0.022 + rand(0, 0.09),
        color: pickColor(),
        duration: rand(0.58, 0.78),
      });
    }
  });
  return out;
}

function gatherParticles(
  centers: Array<{ x: number; y: number }>,
  bounds: { w: number; h: number },
  perLetter = PARTICLES_PER_LETTER
): Particle[] {
  const out: Particle[] = [];
  centers.forEach((c, li) => {
    for (let i = 0; i < perLetter; i++) {
      out.push({
        id: `g-${li}-${i}-${Math.random().toString(36).slice(2, 9)}`,
        fromX: rand(-bounds.w * 0.25, bounds.w * 1.25),
        fromY: rand(-bounds.h * 1.1, bounds.h * 2.1),
        toX: c.x + rand(-1.2, 1.2),
        toY: c.y + rand(-1.2, 1.2),
        size: rand(1.5, 3.4),
        delay: li * 0.028 + rand(0, 0.07),
        color: pickColor(),
        duration: rand(0.6, 0.88),
      });
    }
  });
  return out;
}

interface ParticleWordCycleProps {
  className?: string;
  /** Horizontal alignment of the cycling word inside its reserved width */
  align?: "start" | "center";
}

/**
 * Premium looping word: dissolves into particles, then reforms the next word.
 * Sequence: work → earn → scale → matter
 */
export function ParticleWordCycle({
  className = "",
  align = "start",
}: ParticleWordCycleProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  // Mobile: light crossfade only (particles are expensive on low-power GPUs)
  const lightMode = Boolean(reduceMotion || isMobile);
  const perLetter = isMobile
    ? PARTICLES_PER_LETTER_MOBILE
    : PARTICLES_PER_LETTER;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showLetters, setShowLetters] = useState(true);

  const containerRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const word = HERO_LOOP_WORDS[index]!;
  const longest = useMemo(
    () =>
      HERO_LOOP_WORDS.reduce((a, b) => (a.length >= b.length ? a : b)),
    []
  );

  const measureCenters = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return letterCenters(letterRefs.current, container);
  }, []);

  // Light mode (mobile / reduced motion): simple opacity cycle, no particles
  useEffect(() => {
    if (!lightMode) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_LOOP_WORDS.length);
    }, HOLD_MS + 500);
    return () => window.clearInterval(t);
  }, [lightMode]);

  // Full particle state machine (desktop only)
  useEffect(() => {
    if (lightMode) return;

    if (phase === "visible") {
      setShowLetters(true);
      setParticles([]);
      const t = window.setTimeout(() => setPhase("dissolving"), HOLD_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === "dissolving") {
      const centers = measureCenters();
      if (centers.length) setParticles(scatterParticles(centers, perLetter));
      const fade = window.requestAnimationFrame(() => setShowLetters(false));
      const t = window.setTimeout(() => {
        setIndex((i) => (i + 1) % HERO_LOOP_WORDS.length);
        setPhase("reforming");
      }, DISSOLVE_MS);
      return () => {
        window.cancelAnimationFrame(fade);
        window.clearTimeout(t);
      };
    }

    if (phase === "reforming") {
      setShowLetters(false);
      const showT = window.setTimeout(
        () => setShowLetters(true),
        Math.floor(REFORM_MS * 0.58)
      );
      const t = window.setTimeout(() => {
        setParticles([]);
        setPhase("visible");
      }, REFORM_MS);
      return () => {
        window.clearTimeout(showT);
        window.clearTimeout(t);
      };
    }
  }, [phase, lightMode, measureCenters, perLetter]);

  // Spawn gather particles after next word letters mount (coords relative to container)
  useLayoutEffect(() => {
    if (lightMode || phase !== "reforming") return;
    const container = containerRef.current;
    if (!container) return;

    const centers = measureCenters();
    if (!centers.length) return;

    setParticles(
      gatherParticles(
        centers,
        {
          w: container.offsetWidth || 140,
          h: container.offsetHeight || 52,
        },
        perLetter
      )
    );
  }, [phase, index, lightMode, measureCenters, perLetter]);

  useEffect(() => {
    letterRefs.current = letterRefs.current.slice(0, word.length);
  }, [word]);

  const justify =
    align === "center" ? "justify-center" : "justify-start";

  if (lightMode) {
    return (
      <span
        className={`relative inline-block font-display text-headline ${className}`}
        aria-live="polite"
      >
        <span className="invisible select-none" aria-hidden>
          {longest}
        </span>
        <span className={`absolute inset-0 flex items-center ${justify}`}>
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="whitespace-nowrap"
          >
            {word}
          </motion.span>
        </span>
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={`relative inline-block align-baseline font-display text-headline ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Width lock — longest word avoids layout shift */}
      <span className="invisible select-none whitespace-nowrap" aria-hidden>
        {longest}
      </span>

      {/* Letters — measured relative to containerRef */}
      <span className={`absolute inset-0 flex items-center ${justify}`}>
        <span className="inline-flex whitespace-nowrap">
          {word.split("").map((char, i) => {
            const dissolveY = ((i * 13) % 11) - 5;
            const dissolveX = ((i * 7) % 9) - 4;

            return (
              <span
                key={`${word}-slot-${i}`}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                className="relative inline-block"
              >
                <motion.span
                  className="inline-block will-change-[transform,opacity,filter]"
                  initial={false}
                  animate={
                    showLetters
                      ? {
                          opacity: 1,
                          x: 0,
                          y: 0,
                          filter: "blur(0px)",
                          scale: 1,
                        }
                      : phase === "dissolving"
                        ? {
                            opacity: 0,
                            x: dissolveX,
                            y: dissolveY,
                            filter: "blur(5px)",
                            scale: 0.82,
                          }
                        : {
                            opacity: 0,
                            x: 0,
                            y: 8,
                            filter: "blur(4px)",
                            scale: 0.9,
                          }
                  }
                  transition={{
                    duration: phase === "dissolving" ? 0.38 : 0.45,
                    delay: showLetters ? i * 0.028 : i * 0.016,
                    ease: EASE,
                  }}
                >
                  {char}
                </motion.span>
              </span>
            );
          })}
        </span>
      </span>

      {/* Particles share container coordinate space with letter measurements */}
      <span
        className="pointer-events-none absolute inset-0 overflow-visible"
        aria-hidden
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute left-0 top-0 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              boxShadow:
                p.size > 2.5
                  ? `0 0 ${p.size * 1.6}px ${p.color}40`
                  : undefined,
            }}
            initial={{
              x: p.fromX,
              y: p.fromY,
              opacity: phase === "dissolving" ? 0.92 : 0,
              scale: phase === "dissolving" ? 1 : 0.35,
            }}
            animate={
              phase === "dissolving"
                ? {
                    x: p.toX,
                    y: p.toY,
                    opacity: 0,
                    scale: 0.25,
                  }
                : {
                    x: p.toX,
                    y: p.toY,
                    opacity: [0, 0.95, 0.8, 0],
                    scale: [0.35, 1.05, 1, 0.55],
                  }
            }
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: EASE,
            }}
          />
        ))}
      </span>

      <span className="sr-only">{word}</span>
    </span>
  );
}
