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

export async function GET() {
  const apiKey = process.env.AGENTROUTER_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json({ status: 0, kind: "unconfigured", wrote: false });
  }

  const body = JSON.stringify({
    model: "gpt-6-astra",
    messages: [{ role: "user", content: "Reply with the word OK." }],
    max_tokens: 8,
    stream: false,
  });

  try {
    const upstream = await new Promise<{ status: number; text: string }>((resolve, reject) => {
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
    const start = upstream.text.replace(/^\uFEFF/, "").trimStart();
    const kind = start.startsWith("<")
      ? "html"
      : start.startsWith("{") || start.startsWith("[")
        ? "json"
        : "other";
    return NextResponse.json({
      status: upstream.status,
      kind,
      wrote: kind === "json" && wroteText(start),
    });
  } catch {
    return NextResponse.json({ status: 0, kind: "error", wrote: false });
  }
}
