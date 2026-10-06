import https from "node:https";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const dynamic = "force-dynamic";

const body = JSON.stringify({
  model: "gpt-6-astra",
  messages: [{ role: "user", content: "Reply with the word OK." }],
  max_tokens: 8,
  stream: false,
});

function post(hostname: string, apiKey: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path: "/v1/chat/completions",
        method: "POST",
        family: 4,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "user-agent": "opencode/1.18.25",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    req.setTimeout(15_000, () => req.destroy(new Error("timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function kindOf(text: string): string {
  const start = text.replace(/^\uFEFF/, "").trimStart();
  if (start.startsWith("<")) return "html";
  if (start.startsWith("{") || start.startsWith("[")) return "json";
  return "other";
}

function wrote(text: string): boolean {
  try {
    const json = JSON.parse(text) as { choices?: { message?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0;
  } catch {
    return false;
  }
}

async function check(hostname: string, apiKey: string) {
  try {
    const dummy = await post(hostname, "sk-probe-invalid");
    const kind = kindOf(dummy.text);
    if (kind !== "json" || !apiKey) {
      return { status: dummy.status, kind, bytes: dummy.text.length, wrote: false };
    }
    const live = await post(hostname, apiKey);
    const liveKind = kindOf(live.text);
    return {
      status: live.status,
      kind: liveKind,
      bytes: live.text.length,
      wrote: liveKind === "json" && wrote(live.text),
    };
  } catch {
    return { status: 0, kind: "error", bytes: 0, wrote: false };
  }
}

export async function GET() {
  const apiKey = (process.env.AGENTROUTER_API_KEY ?? "").trim();
  const [w, p] = await Promise.all([
    check("www.agentrouter.org", apiKey),
    check("ps.air-outer.com", apiKey),
  ]);
  return NextResponse.json({ w, p });
}
