"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  name: string;
  image?: string | null;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const sizeClass = {
  md: "h-12 w-12 text-[13px] rounded-xl",
  lg: "h-16 w-16 text-lg rounded-2xl sm:h-20 sm:w-20",
  xl: "h-20 w-20 text-xl rounded-2xl sm:h-24 sm:w-24",
};

/**
 * Agent image with graceful fallback to initials when URL missing or broken.
 */
export function AgentAvatar({
  name,
  image,
  size = "lg",
  className,
}: AgentAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image?.trim()) && !failed;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "A";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[#f0ebe3]",
        sizeClass[size],
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!.trim()}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold tracking-tight text-headline-deep">
          {initials}
        </span>
      )}
    </div>
  );
}
