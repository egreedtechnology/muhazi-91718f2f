// Generates patient-friendly social captions for a PUBLISHED blog article.
// Staff-only. Streams the Lovable AI Gateway Responses SSE back to the browser.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
} from "./run-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
};

const SITE = "https://muhazi.lovable.app";

const SYSTEM = `You are the social media writer for Muhazi Dental Clinic in Rwamagana, Rwanda.
Write warm, plain-language, patient-friendly captions that promote a published blog article.
Rules: never mention prices, discounts or guarantees; never invent statistics or clinical claims beyond the article;
no fear-mongering; encourage reading the article and booking a check-up where natural.
Return JSON only, matching the schema. Write in the requested language.`;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    const postId = typeof body?.postId === "string" ? body.postId : "";
    const language = ["English", "Kinyarwanda", "French"].includes(body?.language) ? body.language : "English";
    if (!postId) return json({ error: "Choose a published article" }, 400);

    const { data: post, error: postErr } = await supabase
      .from("blog_posts")
      .select("title, slug, content, excerpt, is_published")
      .eq("id", postId)
      .maybeSingle();
    if (postErr || !post) return json({ error: "Article not found" }, 404);
    if (!post.is_published) return json({ error: "Only published articles can be used" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    const plain = String(post.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
    const url = `${SITE}/blog/${post.slug}`;
    const userPrompt = `Language: ${language}\nArticle URL: ${url}\nTitle: ${post.title}\nExcerpt: ${post.excerpt || ""}\n\nArticle:\n${plain}\n\nWrite one caption each for Facebook (2-4 sentences), Instagram (friendly, with 5-8 hashtags), X (under 260 characters including the URL), WhatsApp status (short, conversational) and LinkedIn (professional). Include the article URL in Facebook, X, WhatsApp and LinkedIn captions.`;

    const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const upstream = await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: {
          format: {
            type: "json_schema",
            name: "social_captions",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["captions"],
              properties: {
                captions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["platform", "text"],
                    properties: {
                      platform: { type: "string", enum: ["Facebook", "Instagram", "X", "WhatsApp", "LinkedIn"] },
                      text: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    const headers = getLovableAiGatewayResponseHeaders(upstream.headers, corsHeaders);
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`AI gateway failed [${upstream.status}]: ${detail}`);
      let message = "AI request failed";
      try { message = JSON.parse(detail)?.error?.message || JSON.parse(detail)?.message || message; } catch { /* text */ }
      if (upstream.status === 429) message = "AI is busy right now. Please try again in a minute.";
      if (upstream.status === 402) message = "AI credits are used up. Add credits in workspace settings.";
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: message }), { status: upstream.status, headers });
    }
    headers.set("Content-Type", "text/event-stream");
    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: corsHeaders });
    console.error("blog-social error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
