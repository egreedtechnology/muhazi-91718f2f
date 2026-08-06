// Blog AI writing assistant. Admin-only: requires an authenticated staff user.
// Additive — used exclusively by the Blog Management module.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Task =
  | "outline"
  | "expand"
  | "grammar"
  | "rewrite"
  | "seo_titles"
  | "faqs"
  | "summary"
  | "internal_links"
  | "image_ideas"
  | "social";

const PROMPTS: Record<Task, string> = {
  outline:
    "Create a detailed article outline for a dental clinic blog post. Use H2 and H3 headings covering introduction, symptoms, causes, diagnosis, treatment, prevention, home care and when to see a dentist where relevant. Return clean semantic HTML only (h2, h3, p, ul, li). No markdown, no code fences.",
  expand:
    "Expand the provided text into well-developed, medically accurate paragraphs for a dental clinic blog. Keep a warm, plain-English tone suitable for patients in Rwanda. Return clean semantic HTML only (p, ul, li, h3). No markdown, no code fences.",
  grammar:
    "Correct grammar, spelling and punctuation in the provided content without changing its meaning, structure or HTML tags. Return the corrected HTML only. No markdown, no code fences.",
  rewrite:
    "Rewrite the provided content in a professional, trustworthy medical tone for a dental clinic. Keep all facts. Improve clarity and flow. Return clean semantic HTML only. No markdown, no code fences.",
  seo_titles:
    "Suggest 6 SEO-optimised article titles, each 50-60 characters, based on the content. Return a plain HTML unordered list only. No markdown, no code fences.",
  faqs:
    "Write 5 patient FAQs with concise answers based on the content. Return ONLY a JSON array of objects with the keys \"question\" and \"answer\". No markdown, no code fences, no commentary.",
  summary:
    "Write a 2-3 sentence patient-friendly summary of the article, under 300 characters. Return plain text only.",
  internal_links:
    "Suggest 5 related dental topics this article should link to internally, with a short reason for each. Return a plain HTML unordered list only. No markdown, no code fences.",
  image_ideas:
    "Suggest 5 specific image ideas for this article, each with suggested alt text. Return a plain HTML unordered list only. No markdown, no code fences.",
  social:
    "Write 3 short social media captions (Facebook, Instagram, X) promoting this article. Include relevant hashtags. Return a plain HTML unordered list only. No markdown, no code fences.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return json({ error: "Staff access required" }, 403);

    const body = await req.json().catch(() => null);
    const task = body?.task as Task;
    const content = typeof body?.content === "string" ? body.content.slice(0, 20000) : "";
    const title = typeof body?.title === "string" ? body.title.slice(0, 300) : "";
    const keyword = typeof body?.keyword === "string" ? body.keyword.slice(0, 200) : "";

    if (!task || !PROMPTS[task]) return json({ error: "Unknown task" }, 400);
    if (!content.trim() && !title.trim()) return json({ error: "Provide a title or some content first" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    const userPrompt = [
      title ? `Article title: ${title}` : "",
      keyword ? `Focus keyword: ${keyword}` : "",
      content ? `Content:\n${content}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a medical content editor for Muhazi Dental Clinic in Rwamagana, Rwanda. Write accurate, cautious, patient-friendly dental content. Never invent statistics, prices, guarantees or clinical claims. Never mention prices. " +
              PROMPTS[task],
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${detail}`);
      if (res.status === 429) return json({ error: "AI rate limit reached. Please try again shortly." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
      return json({ error: "AI request failed", details: detail }, res.status);
    }

    const data = await res.json();
    let result: string = data?.choices?.[0]?.message?.content ?? "";
    result = result.replace(/^```(?:html|json)?\s*/i, "").replace(/```\s*$/, "").trim();

    return json({ result, task });
  } catch (e) {
    console.error("blog-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
