"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import { Loader2 } from "lucide-react";
import { AgentImageField } from "@/components/agents/AgentImageField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { agentEditErrors, withAgentEdits, type AgentEditDraft } from "@/lib/agentEdits";
import { parseAgentDataUri } from "@/lib/agentMetadata";
import { jsonToAgentDataUri } from "@/lib/agentRegistration";
import { updateRegisteredAgent } from "@/lib/localAgents";
import { useUpdateAgentUri } from "@/hooks/useUpdateAgentUri";
import type { Agent } from "@/types/agent";

interface EditAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function draftFromAgent(agent: Agent): AgentEditDraft {
  return {
    name: agent.name,
    description: agent.description,
    image: agent.image ?? "",
    pricePerTask: String(agent.pricePerTask),
  };
}

export function EditAgentDialog({
  agent,
  open,
  onClose,
  onSaved,
}: EditAgentDialogProps) {
  const { address } = useAccount();
  const { updateAgentUri, isPending, reset, publicClient } = useUpdateAgentUri();
  const [draft, setDraft] = useState<AgentEditDraft>({
    name: "",
    description: "",
    image: "",
    pricePerTask: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "reading" | "wallet" | "confirming">("idle");
  const [submitError, setSubmitError] = useState("");

  const saving = phase !== "idle" || isPending;

  const openedId = open ? agent?.id ?? null : null;

  useEffect(() => {
    if (!open || !agent || openedId == null) return;
    setDraft(draftFromAgent(agent));
    setErrors({});
    setSubmitError("");
    setPhase("idle");
    reset();
    // Seed the form once each time this agent is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, openedId]);

  useEffect(() => {
    if (!open || saving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const setField = (key: keyof AgentEditDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  async function save() {
    if (!agent) return;
    const nextErrors = agentEditErrors(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!address || !isAddress(agent.owner) || address.toLowerCase() !== agent.owner.toLowerCase()) {
      setSubmitError("Connect the owner wallet to edit this agent.");
      return;
    }
    if (!publicClient) {
      setSubmitError("Could not reach Arc. Check your connection and try again.");
      return;
    }

    const price = Number(draft.pricePerTask);
    const unchanged =
      draft.name.trim() === agent.name &&
      draft.description.trim() === agent.description &&
      draft.image.trim() === (agent.image ?? "") &&
      price === agent.pricePerTask;
    if (unchanged) {
      onClose();
      return;
    }

    setSubmitError("");
    reset();
    setPhase("reading");
    try {
      const tokenUri = String(
        await publicClient.readContract({
          address: identityRegistryAddress,
          abi: identityRegistryAbi,
          functionName: "tokenURI",
          args: [BigInt(agent.id)],
        })
      );
      const current = await readRegistration(tokenUri);
      const nextFile = withAgentEdits(
        current,
        {
          name: draft.name,
          description: draft.description,
          image: draft.image,
          pricePerTask: price,
        },
        {
          owner: agent.owner as Address,
          draft: {
            name: draft.name,
            description: draft.description,
            image: draft.image,
            capabilities: agent.capabilities,
            categories: agent.categories ?? [],
            pricePerTask: draft.pricePerTask,
            x402Endpoint: agent.x402Endpoint ?? "",
          },
        }
      );

      setPhase("wallet");
      await updateAgentUri(agent.id, jsonToAgentDataUri(nextFile), () => {
        setPhase("confirming");
      });
      updateRegisteredAgent(agent.id, {
        name: draft.name.trim(),
        description: draft.description.trim(),
        image: draft.image.trim() || undefined,
        pricePerTask: price,
        owner: agent.owner,
      });
      onSaved?.();
      onClose();
    } catch (caught) {
      setPhase("idle");
      setSubmitError(
        caught instanceof Error ? caught.message : "The agent was not updated."
      );
    }
  }

  return (
    <AnimatePresence>
      {open && agent ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
            onClick={() => {
              if (!saving) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-agent-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background-warm p-6 shadow-soft-lg"
          >
            <h2 id="edit-agent-title" className="font-display text-xl text-headline">
              Edit agent
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Update the picture, description, and fee for {agent.name} (#{agent.id}). Your wallet
              confirms the change on Arc.
            </p>

            <div className="mt-5 space-y-5">
              <AgentImageField
                value={draft.image}
                error={errors.image}
                onChange={(value) => setField("image", value)}
                onError={(message) => setErrors((current) => ({ ...current, image: message }))}
              />
              <Input
                label="Name"
                name="edit-name"
                required
                value={draft.name}
                onChange={(event) => setField("name", event.target.value)}
                error={errors.name}
              />
              <Textarea
                label="Description"
                name="edit-description"
                required
                rows={4}
                value={draft.description}
                onChange={(event) => setField("description", event.target.value)}
                error={errors.description}
              />
              <Input
                label="Price per task (USDC)"
                name="edit-price"
                required
                type="number"
                min={0}
                step="0.001"
                value={draft.pricePerTask}
                onChange={(event) => setField("pricePerTask", event.target.value)}
                error={errors.pricePerTask}
                hint="Buyers pay this fee when they request work."
              />
            </div>

            {submitError ? (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="md" onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {phase === "reading"
                      ? "Reading registration…"
                      : phase === "confirming"
                        ? "Saving on Arc…"
                        : "Confirm in wallet…"}
                  </>
                ) : (
                  "Save on Arc"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

async function readRegistration(tokenUri: string): Promise<unknown> {
  const uri = tokenUri.trim();
  if (!uri) return null;
  if (uri.startsWith("data:")) {
    const parsed = parseAgentDataUri(uri);
    if (!parsed) throw new Error("Could not read this agent's registration.");
    return parsed;
  }
  if (!uri.startsWith("https://")) {
    throw new Error("Could not read this agent's registration.");
  }
  const response = await fetch(uri, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("Could not read this agent's registration.");
  return response.json() as Promise<unknown>;
}
