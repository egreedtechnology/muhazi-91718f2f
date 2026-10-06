import { supabase } from "@/integrations/supabase/client";

/** Calls a staff edge function that streams Responses SSE and returns the parsed JSON output. */
export async function streamAiJson<T>(fn: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", streamErr = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta") text += ev.delta;
        else if (ev.type === "error" || ev.type === "response.failed")
          streamErr = ev.error?.message || ev.response?.error?.message || "AI request failed";
        else if (ev.type === "response.refusal.delta") streamErr = "The AI declined this request.";
      } catch { /* partial line */ }
    }
  }
  if (streamErr) throw new Error(streamErr);
  if (!text.trim()) throw new Error("The AI returned nothing.");
  return JSON.parse(text) as T;
}
