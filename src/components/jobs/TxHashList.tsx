"use client";

import { ExternalLink } from "lucide-react";
import { explorerTxUrl, shortenAddress } from "@/lib/format";

export type TxEntry = {
  label: string;
  hash?: string | null;
};

export function TxHashList({ entries }: { entries: TxEntry[] }) {
  const list = entries.filter((e) => e.hash && e.hash.startsWith("0x"));
  if (list.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-[#faf8f5] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-soft">
        Transaction hashes
      </p>
      <ul className="space-y-1">
        {list.map((e) => (
          <li
            key={`${e.label}-${e.hash}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]"
          >
            <span className="text-muted">{e.label}</span>
            <a
              href={explorerTxUrl(e.hash!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-headline hover:underline"
            >
              {shortenAddress(e.hash!, 6)}
              <ExternalLink size={11} strokeWidth={1.75} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
