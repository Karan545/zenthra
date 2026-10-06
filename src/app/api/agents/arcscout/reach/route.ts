import https from "node:https";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const dynamic = "force-dynamic";

function wroteText(text: string): boolean {
  try {
    const json = JSON.parse(text) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0;
  } catch {
    return false;
  }
}

function safeNote(text: string): string {
  const start = text.replace(/^\uFEFF/, "").trimStart();
  if (!start.startsWith("{")) return "";
  try {
    const json = JSON.parse(start) as { msg?: unknown; message?: unknown };
    const note = typeof json.msg === "string" ? json.msg : typeof json.message === "string" ? json.message : "";
    if (!note || note.length > 80 || (/sk-|bearer/i.test(note) && note.length > 24)) return "rejected";
    return note;
  } catch {
    return "";
  }
}

function callHost(apiKey: string): Promise<{ status: number; text: string }> {
  const body = JSON.stringify({
    model: "gpt-6-astra",
    messages: [{ role: "user", content: "Reply with the word OK." }],
    max_tokens: 8,
    stream: false,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "co.agentrouter.org",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "user-agent": "opencode/1.18.25",
          host: "co.agentrouter.org",
          "Content-Length": Buffer.byteLength(body),
        },
        family: 4,
        servername: "co.agentrouter.org",
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.setTimeout(20_000, () => req.destroy(new Error("timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function classify(status: number, text: string) {
  const start = text.replace(/^\uFEFF/, "").trimStart();
  const kind = start.startsWith("<")
    ? "html"
    : start.startsWith("{") || start.startsWith("[")
      ? "json"
      : "other";
  return {
    status,
    kind,
    wrote: kind === "json" && wroteText(start),
    note: safeNote(start),
  };
}

export async function GET() {
  const apiKey = process.env.AGENTROUTER_API_KEY ?? "";
  const trimmed = apiKey.trim().replace(/^['"]|['"]$/g, "");
  const shape = {
    set: apiKey.length > 0,
    len: apiKey.length,
    trimLen: trimmed.length,
    sk: trimmed.startsWith("sk-"),
    space: /\s/.test(apiKey),
    quote: apiKey.includes('"') || apiKey.includes("'"),
  };
  if (!trimmed) return NextResponse.json({ shape, raw: null, trim: null });

  try {
    const rawUpstream = await callHost(apiKey);
    const raw = classify(rawUpstream.status, rawUpstream.text);
    if (trimmed === apiKey) return NextResponse.json({ shape, raw, trim: null });
    const trimUpstream = await callHost(trimmed);
    return NextResponse.json({
      shape,
      raw,
      trim: classify(trimUpstream.status, trimUpstream.text),
    });
  } catch {
    return NextResponse.json({
      shape,
      raw: { status: 0, kind: "error", wrote: false, note: "" },
      trim: null,
    });
  }
}
