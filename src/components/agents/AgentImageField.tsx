"use client";

import { Input } from "@/components/ui/Input";
import { imageFileToDataUrl } from "@/lib/agentImage";

export function AgentImageField({
  value,
  error,
  onChange,
  onError,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const uploaded = value.startsWith("data:");

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-foreground">Image</p>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-[#faf8f5] text-[11px] text-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            "None"
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border-strong px-3.5 text-sm font-medium text-foreground hover:border-headline hover:bg-white">
            Upload from computer
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void imageFileToDataUrl(file)
                  .then(onChange)
                  .catch((caught) => {
                    onError(
                      caught instanceof Error
                        ? caught.message
                        : "Could not read that image."
                    );
                  });
              }}
            />
          </label>
          {value ? (
            <button
              type="button"
              className="text-[13px] text-muted hover:text-foreground"
              onClick={() => onChange("")}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-muted-soft">
        PNG, JPEG, WebP, or GIF. A large photo is resized so it can be saved with the listing.
      </p>
      <div className="mt-3">
        <Input
          label="Image URL"
          name="image"
          placeholder="https://… (optional)"
          value={uploaded ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          hint={
            uploaded
              ? "A picture from your computer is selected. Paste a link to replace it."
              : "Optional. Paste a link if the picture is already online."
          }
        />
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}
