"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CapabilityPicker } from "@/components/ui/CapabilityPicker";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { Input } from "@/components/ui/Input";
import { StepProgress } from "@/components/ui/StepProgress";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import type { Agent, AgentRegistrationDraft } from "@/types/agent";
import { useRegisterAgent } from "@/hooks/useRegisterAgent";
import {
  buildAgentRegistrationFile,
  toAgentDataUri,
} from "@/lib/agentRegistration";
import { categoryNamesFromSlugs } from "@/lib/categories";
import { saveRegisteredAgent } from "@/lib/localAgents";
import { ListOnZenthraCard } from "@/components/register/ListOnZenthra";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import type { Hash } from "viem";

const STEPS = ["Basic info", "Capabilities", "Pricing", "Review"];

const emptyDraft: AgentRegistrationDraft = {
  name: "",
  description: "",
  image: "",
  capabilities: [],
  categories: [],
  pricePerTask: "",
  x402Endpoint: "",
};

type FieldErrors = Partial<Record<keyof AgentRegistrationDraft, string>>;

type SubmitPhase = "idle" | "wallet" | "confirming" | "done";

type RegistrationSuccess = {
  agent: Agent;
  agentId: number;
  txHash: Hash;
  /** False if tx succeeded but Transfer log could not be parsed. */
  agentIdKnown: boolean;
};

function validateStep(
  step: number,
  draft: AgentRegistrationDraft
): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    if (!draft.name.trim()) errors.name = "Name is required.";
    else if (draft.name.trim().length < 2)
      errors.name = "Use at least 2 characters.";
    if (!draft.description.trim())
      errors.description = "Description is required.";
    else if (draft.description.trim().length < 20)
      errors.description = "Add a bit more detail (20+ characters).";
    if (draft.image.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(draft.image.trim());
      } catch {
        errors.image = "Enter a valid image URL.";
      }
    }
  }
  if (step === 1) {
    if (draft.categories.length === 0)
      errors.categories = "Select at least one category.";
    if (draft.capabilities.length === 0)
      errors.capabilities = "Select at least one capability.";
  }
  if (step === 2) {
    const price = Number(draft.pricePerTask);
    if (!draft.pricePerTask.trim())
      errors.pricePerTask = "Price per task is required.";
    else if (!Number.isFinite(price) || price < 0)
      errors.pricePerTask = "Enter a valid non-negative number.";
    if (draft.x402Endpoint.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(draft.x402Endpoint.trim());
      } catch {
        errors.x402Endpoint = "Enter a valid endpoint URL.";
      }
    }
  }
  return errors;
}

export function RegisterWizard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { registerOnChain, isPending, reset } = useRegisterAgent();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AgentRegistrationDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);

  const submitting = phase === "wallet" || phase === "confirming" || isPending;

  const setField = <K extends keyof AgentRegistrationDraft>(
    key: K,
    value: AgentRegistrationDraft[K]
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const priceNumber = useMemo(
    () => Number(draft.pricePerTask),
    [draft.pricePerTask]
  );

  const goNext = () => {
    const nextErrors = validateStep(step, draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    const allErrors = {
      ...validateStep(0, draft),
      ...validateStep(1, draft),
      ...validateStep(2, draft),
    };
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setStep(0);
      return;
    }
    if (!isConnected || !address) {
      setSubmitError("Connect your wallet on Arc Testnet to register.");
      return;
    }

    setSubmitError(null);
    reset();

    try {
      const registrationFile = buildAgentRegistrationFile(draft, address);
      const agentURI = toAgentDataUri(registrationFile);

      setPhase("wallet");
      const { hash, agentId } = await registerOnChain(agentURI, {
        onSubmitted: () => setPhase("confirming"),
      });

      // Prefer on-chain token id; if logs couldn't be parsed, still show success + tx
      const idNum =
        agentId != null
          ? Number.isSafeInteger(Number(agentId))
            ? Number(agentId)
            : Number(agentId.toString())
          : Date.now() % 1_000_000;

      const agent: Agent = {
        id: idNum,
        name: draft.name.trim(),
        description: draft.description.trim(),
        image: draft.image.trim() || undefined,
        capabilities: draft.capabilities,
        categories: [...draft.categories],
        reputation: 80,
        pricePerTask: priceNumber,
        owner: address,
        x402Endpoint: draft.x402Endpoint.trim() || undefined,
        isOnChain: true,
        txHash: hash,
        registeredAt: new Date().toISOString(),
      };

      saveRegisteredAgent(agent);
      setSuccess({
        agent,
        agentId: agentId != null ? idNum : idNum,
        txHash: hash,
        agentIdKnown: agentId != null,
      });
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="card-surface mx-auto max-w-xl rounded-2xl px-6 py-12 text-center sm:px-10 sm:py-14"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebe3] text-headline">
          <CheckCircle2 size={28} strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
          On-chain success
        </p>
        <h2 className="mt-3 font-display text-3xl text-headline">
          Agent registered
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">
            {success.agent.name}
          </span>{" "}
          was minted on the ERC-8004 Identity Registry on Arc Testnet.
        </p>
        <div className="mt-6 space-y-3 rounded-xl border border-border bg-[#faf8f5] px-4 py-4 text-left text-sm">
          <div>
            <p className="text-muted-soft">Agent ID</p>
            <p className="font-mono text-lg font-medium text-foreground">
              {success.agentIdKnown
                ? `#${success.agentId}`
                : "See transaction logs"}
            </p>
            {!success.agentIdKnown ? (
              <p className="mt-1 text-[12px] text-muted">
                Mint confirmed; open the tx on ArcScan to read the token id from
                the Transfer event.
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-muted-soft">Owner</p>
            <p className="font-mono text-foreground">
              {shortenAddress(success.agent.owner)}
            </p>
          </div>
          <div>
            <p className="text-muted-soft">Transaction</p>
            <a
              href={explorerTxUrl(success.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-headline hover:underline"
            >
              {shortenAddress(success.txHash, 6)}
              <ExternalLink size={13} strokeWidth={1.75} />
            </a>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-soft">
              {success.txHash}
            </p>
          </div>
        </div>
        <ListOnZenthraCard
          agent={success.agent}
          agentIdKnown={success.agentIdKnown}
          onListed={(hash) => {
            setSuccess((s) =>
              s
                ? {
                    ...s,
                    agent: {
                      ...s.agent,
                      isListedOnZenthra: true,
                      listTxHash: hash,
                    },
                  }
                : s
            );
          }}
        />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            href={`/agent/${success.agentId}`}
            variant="primary"
            size="md"
          >
            View profile
          </Button>
          <Button href="/" variant="secondary" size="md">
            Open directory
          </Button>
        </div>
        <button
          type="button"
          className="mt-6 text-[13px] text-muted hover:text-foreground"
          onClick={() => {
            setSuccess(null);
            setDraft(emptyDraft);
            setStep(0);
            setPhase("idle");
            setSubmitError(null);
            reset();
          }}
        >
          Register another agent
        </button>
      </motion.div>
    );
  }

  const submitLabel =
    phase === "wallet"
      ? "Confirm in wallet…"
      : phase === "confirming"
        ? "Confirming on Arc…"
        : "Register Agent on Arc";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 sm:mb-10">
        <StepProgress steps={STEPS} current={step} />
      </div>

      <div className="card-surface rounded-2xl p-5 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl text-headline">
                    Basic info
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Name and describe your agent so operators know what it does.
                  </p>
                </div>
                <Input
                  label="Agent name"
                  name="name"
                  required
                  placeholder="e.g. ArcScout"
                  value={draft.name}
                  onChange={(e) => setField("name", e.target.value)}
                  error={errors.name}
                />
                <Textarea
                  label="Description"
                  name="description"
                  required
                  placeholder="What does this agent do? Who is it for?"
                  value={draft.description}
                  onChange={(e) => setField("description", e.target.value)}
                  error={errors.description}
                />
                <Input
                  label="Image URL"
                  name="image"
                  placeholder="https://… (optional)"
                  value={draft.image}
                  onChange={(e) => setField("image", e.target.value)}
                  error={errors.image}
                  hint="Optional avatar or brand image."
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-2xl text-headline">
                    Categories & capabilities
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Choose directory categories and skill tags so operators can
                    find this agent.
                  </p>
                </div>

                <CategoryPicker
                  value={draft.categories}
                  onChange={(cats) => setField("categories", cats)}
                  error={errors.categories}
                />

                <div className="border-t border-border pt-6">
                  <CapabilityPicker
                    value={draft.capabilities}
                    onChange={(caps) => setField("capabilities", caps)}
                    error={errors.capabilities}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl text-headline">
                    Pricing & endpoint
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Set task pricing and an optional x402 service endpoint.
                  </p>
                </div>
                <Input
                  label="Price per task (USDC)"
                  name="pricePerTask"
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="2.50"
                  value={draft.pricePerTask}
                  onChange={(e) => setField("pricePerTask", e.target.value)}
                  error={errors.pricePerTask}
                />
                <Input
                  label="x402 endpoint"
                  name="x402Endpoint"
                  placeholder="https://api.your-agent.com/x402 (optional)"
                  value={draft.x402Endpoint}
                  onChange={(e) => setField("x402Endpoint", e.target.value)}
                  error={errors.x402Endpoint}
                  hint="Where clients call your agent for paid tasks."
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl text-headline">
                    Review & confirm
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Confirm details, then mint on the Identity Registry (Arc
                    Testnet).
                  </p>
                </div>

                <dl className="divide-y divide-border rounded-xl border border-border bg-[#faf8f5]">
                  <ReviewRow label="Name" value={draft.name} />
                  <ReviewRow label="Description" value={draft.description} />
                  <ReviewRow
                    label="Categories"
                    value={
                      categoryNamesFromSlugs(draft.categories).join(", ") ||
                      "—"
                    }
                  />
                  <ReviewRow
                    label="Capabilities"
                    value={draft.capabilities.join(", ") || "—"}
                  />
                  <ReviewRow
                    label="Price / task"
                    value={
                      Number.isFinite(priceNumber)
                        ? `${priceNumber} USDC`
                        : "—"
                    }
                  />
                  <ReviewRow
                    label="Image"
                    value={draft.image.trim() || "None"}
                  />
                  <ReviewRow
                    label="x402 endpoint"
                    value={draft.x402Endpoint.trim() || "None"}
                  />
                  <ReviewRow
                    label="Wallet"
                    value={
                      address ? shortenAddress(address) : "Not connected"
                    }
                  />
                  <ReviewRow label="Network" value="Arc Testnet (5042002)" />
                  <ReviewRow
                    label="Contract"
                    value="IdentityRegistry.register(string)"
                  />
                </dl>

                {!isConnected ? (
                  <div className="rounded-xl border border-border bg-white p-4">
                    <p className="mb-3 text-sm text-muted">
                      Connect a wallet on Arc Testnet to finish registration.
                    </p>
                    <ConnectWallet size="md" />
                  </div>
                ) : null}

                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    {submitError}
                  </div>
                ) : null}

                {submitting ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
                    <Loader2 size={16} className="animate-spin text-headline" />
                    {phase === "wallet"
                      ? "Approve the transaction in your wallet…"
                      : "Waiting for Arc Testnet confirmation…"}
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={step === 0 || submitting}
            className={step === 0 ? "invisible sm:visible sm:opacity-0" : ""}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" size="md" onClick={goNext}>
              Continue
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleSubmit()}
              disabled={submitting || !isConnected}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {submitLabel}
                </>
              ) : (
                "Register Agent on Arc"
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-muted-soft">
        Prefer browsing first?{" "}
        <button
          type="button"
          className="text-headline underline-offset-2 hover:underline"
          onClick={() => router.push("/")}
        >
          Open the directory
        </button>
      </p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-soft">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}
