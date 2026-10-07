// AI trending-post suggestions for the Blog Studio. Staff-only.
// mode "ideas": suggests trending dental topics. mode "article": writes a full article for one idea.
// Streams Lovable AI Gateway Responses SSE back to the browser.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
} from "./run-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
};

const BASE = `You are the medical content editor for Muhazi Dental Clinic in Rwamagana, Rwanda.
Write accurate, cautious, patient-friendly dental content in plain English. Never mention prices, discounts or guarantees.
Never invent statistics, studies or clinical claims. Return JSON only, matching the schema.`;

const CATEGORIES = ["general", "dental-tips", "news", "patient-stories", "education"];

const IDEAS_SCHEMA = {
  type: "object", additionalProperties: false, required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "angle", "why_trending", "focus_keyword", "category"],
        properties: {
          title: { type: "string" },
          angle: { type: "string" },
          why_trending: { type: "string" },
          focus_keyword: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
        },
      },
    },
  },
};

const ARTICLE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["title", "content_html", "excerpt", "meta_title", "meta_description", "focus_keyword", "tags", "summary", "faqs"],
  properties: {
    title: { type: "string" },
    content_html: { type: "string" },
    excerpt: { type: "string" },
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    focus_keyword: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    faqs: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
  },
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return json({ error: "Staff access required" }, 403);

    const body = await req.json().catch(() => null);
    const mode = body?.mode;
    if (mode !== "ideas" && mode !== "article" && mode !== "image") return json({ error: "Unknown mode" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    if (mode === "image") {
      const title = str(body?.title, 200);
      if (!title) return json({ error: "Missing idea title" }, 400);
      const stream = body?.stream !== false;
      const prompt = `Editorial blog cover photo for a dental clinic article titled "${title}". ${str(body?.angle, 300)}
Warm, clean, professional, natural light, friendly East African patients or dental care scene, modern clinic setting, wide landscape composition. No text, no logos, no watermarks, no blood, no graphic medical imagery.`;
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        signal: req.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "openai/gpt-image-2.5-sunburst",
          prompt,
          size: "1536x1024",
          ...(stream ? { stream: true, partial_images: 1 } : {}),
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        console.error(`Image gateway failed [${upstream.status}]: ${detail}`);
        let message = "Image generation failed";
        try { const p = JSON.parse(detail); message = p?.error?.message || p?.message || message; } catch { /* text */ }
        if (upstream.status === 429) message = "AI is busy right now. Please try again in a minute.";
        if (upstream.status === 402) message = "AI credits are used up. Add credits in workspace settings.";
        return json({ error: message }, upstream.status);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    let userPrompt: string;
    let schema: unknown;
    let name: string;
    if (mode === "ideas") {
      const { data: existing } = await supabase.from("blog_posts").select("title").limit(200);
      const titles = (existing || []).map((p: { title: string }) => `- ${p.title}`).join("\n");
      const month = new Date().toLocaleString("en-GB", { month: "long", year: "numeric" });
      userPrompt = `Current month: ${month}.
Suggest 5 dental blog posts that patients in Rwanda and East Africa are likely searching for right now (seasonal concerns, common questions, school terms, holidays, widely discussed oral-health topics). Each must have a clear patient benefit and an SEO focus keyword.
Do not repeat or closely overlap these existing articles:
${titles || "(none yet)"}`;
      schema = IDEAS_SCHEMA; name = "trending_ideas";
    } else {
      const title = str(body?.title, 200);
      if (!title) return json({ error: "Missing idea title" }, 400);
      userPrompt = `Write a complete, publish-ready blog article.
Title: ${title}
Angle: ${str(body?.angle, 500)}
Focus keyword: ${str(body?.focus_keyword, 100)}

Requirements: 800-1100 words; content_html uses only semantic HTML (h2, h3, p, ul, ol, li, strong, blockquote) with no h1, no markdown; use the focus keyword in the first paragraph and naturally 4-8 times; include sections such as overview, signs/causes, treatment or care, prevention, when to see a dentist; end with a short paragraph inviting readers to <a href="/book-appointment">book a check-up at Muhazi Dental Clinic</a>.
meta_title 45-60 characters; meta_description 120-155 characters; excerpt under 160 characters; summary 2 sentences; 4-6 tags; exactly 4 FAQs.`;
      schema = ARTICLE_SCHEMA; name = "trending_article";
    }

    const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const upstream = await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "system", content: BASE }, { role: "user", content: userPrompt }],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });

    const headers = getLovableAiGatewayResponseHeaders(upstream.headers, corsHeaders);
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`AI gateway failed [${upstream.status}]: ${detail}`);
      let message = "AI request failed";
      try { const p = JSON.parse(detail); message = p?.error?.message || p?.message || message; } catch { /* text */ }
      if (upstream.status === 429) message = "AI is busy right now. Please try again in a minute.";
      if (upstream.status === 402) message = "AI credits are used up. Add credits in workspace settings.";
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: message }), { status: upstream.status, headers });
    }
    headers.set("Content-Type", "text/event-stream");
    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: corsHeaders });
    console.error("blog-trending error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
