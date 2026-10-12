import type { Address } from "viem";
import { agentImageError } from "@/lib/agentImage";
import { buildAgentRegistrationFile } from "@/lib/agentRegistration";
import type { AgentRegistrationDraft } from "@/types/agent";

export type AgentEditDraft = {
  name: string;
  description: string;
  image: string;
  pricePerTask: string;
};

export type AgentEditValues = {
  name: string;
  description: string;
  image: string;
  pricePerTask: number;
};

/** Field messages for the My agents edit form. Empty when the draft can be saved. */
export function agentEditErrors(draft: AgentEditDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = "Name is required.";
  else if (draft.name.trim().length < 2) errors.name = "Use at least 2 characters.";

  if (!draft.description.trim()) errors.description = "Description is required.";
  else if (draft.description.trim().length < 20) {
    errors.description = "Add a bit more detail (20+ characters).";
  }

  const image = agentImageError(draft.image);
  if (image) errors.image = image;

  const price = Number(draft.pricePerTask);
  if (!draft.pricePerTask.trim()) errors.pricePerTask = "Price per task is required.";
  else if (!Number.isFinite(price) || price < 0) {
    errors.pricePerTask = "Enter a valid non-negative number.";
  }

  return errors;
}

/**
 * Apply picture, name, description, and fee onto the current registration.
 * Services and other fields stay as they are. A missing file is rebuilt.
 */
export function withAgentEdits(
  current: unknown,
  edits: AgentEditValues,
  fallback: { owner: Address; draft: AgentRegistrationDraft }
): unknown {
  const name = edits.name.trim();
  const description = edits.description.trim();
  const image = edits.image.trim();

  if (current && typeof current === "object" && !Array.isArray(current)) {
    const next: Record<string, unknown> = {
      ...(current as Record<string, unknown>),
    };
    next.name = name;
    next.description = description;
    if (image) next.image = image;
    else delete next.image;

    const pricing =
      next.pricing && typeof next.pricing === "object"
        ? { ...(next.pricing as Record<string, unknown>) }
        : {};
    const currency = typeof pricing.currency === "string" ? pricing.currency : "USDC";
    next.pricing = {
      ...pricing,
      pricePerTask: edits.pricePerTask,
      currency,
    };
    return next;
  }

  return buildAgentRegistrationFile(
    {
      ...fallback.draft,
      name,
      description,
      image,
      pricePerTask: String(edits.pricePerTask),
    },
    fallback.owner
  );
}
