"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Pencil } from "lucide-react";
import { useJobActions } from "@/hooks/useJobActions";
import { toast } from "sonner";
import type { Job } from "@/types/job";

interface EditJobModalProps {
  job: Job;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditJobModal({ job, open, onClose, onUpdated }: EditJobModalProps) {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const { updateJobDescription, pending } = useJobActions();

  async function handleSave() {
    if (!title.trim()) { return; }
    const newDescription = `${title.trim()}|||${description.trim()}`;
    const unchanged = title.trim() === job.title.trim() && description.trim() === job.description.trim();
    if (unchanged) { onClose(); return; }
    try {
      await updateJobDescription({ jobId: job.id, newDescription });
      toast.success("Job updated.");
      onUpdated();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pencil size={16} strokeWidth={1.75} className="text-headline" />
                <h2 className="font-display text-lg font-semibold text-headline">Edit job</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <p className="mt-1 text-sm text-muted">
              Edit title and description. Budget cannot be changed once locked.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.05em] text-muted">
                  Job title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Short, clear job title…"
                  className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-soft focus:border-headline focus:outline-none focus:ring-1 focus:ring-headline/20 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.05em] text-muted">
                  Job description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Describe the work you need done…"
                  className="w-full resize-none rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-soft focus:border-headline focus:outline-none focus:ring-1 focus:ring-headline/20 transition-colors"
                />
                <p className="mt-1 text-right text-[11px] text-muted-soft">
                  {description.length}/2000
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:bg-surface-muted disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending || !title.trim() || !description.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-headline py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pending ? (
                    <><Loader2 size={14} strokeWidth={1.75} className="animate-spin" />Saving…</>
                  ) : "Save changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
