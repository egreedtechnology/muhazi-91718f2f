// Publishes a published blog article's cover image + caption to the clinic's
// Instagram Business account via the Instagram Graph API. Staff-only.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GRAPH = "https://graph.facebook.com/v21.0";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function graph(path: string, params: Record<string, string>, method = "POST") {
  const qs = new URLSearchParams(params);
  const res = await fetch(method === "GET" ? `${GRAPH}/${path}?${qs}` : `${GRAPH}/${path}`, {
    method,
    body: method === "GET" ? undefined : qs,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data?.error?.message || `Instagram error (${res.status})`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) return json({ error: "Not authenticated" }, 401);
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: u.user.id });
    if (!isStaff) return json({ error: "Staff access required" }, 403);

    const body = await req.json().catch(() => null);
    const postId = typeof body?.postId === "string" ? body.postId : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";
    if (!postId || !caption || caption.length > 2200) return json({ error: "Article and caption (max 2200 chars) required" }, 400);

    const { data: post } = await supabase
      .from("blog_posts").select("title, cover_image_url, is_published").eq("id", postId).maybeSingle();
    if (!post) return json({ error: "Article not found" }, 404);
    if (!post.is_published) return json({ error: "Only published articles can be posted" }, 400);
    if (!post.cover_image_url?.startsWith("https://")) return json({ error: "This article needs a cover image first" }, 400);

    const token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const igUser = Deno.env.get("INSTAGRAM_USER_ID");
    if (!token || !igUser) return json({ error: "Instagram is not connected yet" }, 500);

    // 1) create media container
    const container = await graph(`${igUser}/media`, { image_url: post.cover_image_url, caption, access_token: token });
    // 2) wait until Instagram has fetched the image
    for (let i = 0; i < 15; i++) {
      const s = await graph(container.id, { fields: "status_code", access_token: token }, "GET");
      if (s.status_code === "FINISHED") break;
      if (s.status_code === "ERROR") throw new Error("Instagram could not process the cover image (use JPG, under 8MB).");
      await new Promise((r) => setTimeout(r, 2000));
    }
    // 3) publish
    const published = await graph(`${igUser}/media_publish`, { creation_id: container.id, access_token: token });
    const info = await graph(published.id, { fields: "permalink", access_token: token }, "GET").catch(() => ({}));

    await supabase.from("activity_logs").insert({
      user_id: u.user.id, action: "blog_post.instagram_published", entity_type: "blog_post", entity_id: postId,
      details: { media_id: published.id, permalink: info.permalink ?? null },
    });
    return json({ id: published.id, permalink: info.permalink ?? null });
  } catch (e) {
    console.error("instagram-post error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
