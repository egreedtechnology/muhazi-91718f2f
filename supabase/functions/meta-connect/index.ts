// Connects the clinic's Facebook Page, Instagram Professional account and
// WhatsApp Business number through one Meta (Facebook Login) authorization.
// POST {action:"start", origin} (super_admin/manager) -> { url }
// GET  ?code&state (Meta redirect)                    -> saves tokens, redirects back
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GRAPH = "https://graph.facebook.com/v21.0";
const SCOPES = [
  "pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_messaging",
  "instagram_basic", "instagram_content_publish", "instagram_manage_messages", "instagram_manage_comments",
  "business_management", "whatsapp_business_management", "whatsapp_business_messaging",
].join(",");
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(lovable\.app|lovableproject\.com|muhazidentalclinic\.org)$|^http:\/\/localhost(:\d+)?$/;

const APP_ID = Deno.env.get("META_APP_ID") ?? "";
const APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const REDIRECT = `${SB_URL}/functions/v1/meta-connect`;

const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

async function g(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d?.error?.message || `Meta error ${res.status}`);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!APP_ID || !APP_SECRET) return json({ error: "Meta App ID / secret not configured" }, 500);

  // ---------- Step 1: admin asks for the Meta login link ----------
  if (req.method === "POST") {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Not authenticated" }, 401);
    const sb = createClient(SB_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);
    const [{ data: a }, { data: m }] = await Promise.all([
      sb.rpc("has_role", { _user_id: u.user.id, _role: "super_admin" }),
      sb.rpc("has_role", { _user_id: u.user.id, _role: "manager" }),
    ]);
    if (!a && !m) return json({ error: "Only administrators or managers can connect accounts" }, 403);
    const body = await req.json().catch(() => ({}));
    if (body?.action === "manual_token") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (token.length < 20 || token.length > 2000) return json({ error: "Paste a valid Page access token" }, 400);
      try {
        // Exchange for a long-lived token when possible (page tokens from a long-lived user token never expire)
        let finalToken = token;
        try {
          const ex = await g("oauth/access_token", { grant_type: "fb_exchange_token", client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: token });
          if (ex.access_token) finalToken = ex.access_token;
        } catch { /* keep original */ }
        const me = await g("me", { fields: "id,name,instagram_business_account{id,username}", access_token: finalToken });
        if (!me.instagram_business_account && !me.name) throw new Error("Token not recognised");
        const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const now = new Date().toISOString();
        const connected: string[] = ["Facebook"];
        await admin.from("social_tokens").upsert({ platform: "facebook", access_token: finalToken, external_id: me.id, updated_at: now });
        await admin.from("social_connections").update({ status: "connected", account_name: me.name, page_id: me.id, account_id: me.id, last_checked_at: now, updated_by: u.user.id }).eq("platform", "facebook");
        const ig = me.instagram_business_account;
        if (ig?.id) {
          connected.push("Instagram");
          await admin.from("social_tokens").upsert({ platform: "instagram", access_token: finalToken, external_id: ig.id, updated_at: now });
          await admin.from("social_connections").update({ status: "connected", account_name: ig.username ?? me.name, account_id: ig.id, page_id: me.id, last_checked_at: now, updated_by: u.user.id }).eq("platform", "instagram");
        }
        await admin.from("activity_logs").insert({ user_id: u.user.id, action: "social.manual_token_saved", entity_type: "social_connection", details: { page: me.name, instagram: ig?.username ?? null } });
        return json({ ok: true, page: me.name, connected });
      } catch (e) {
        return json({ error: `Meta rejected this token: ${(e as Error).message}` }, 400);
      }
    }
    const origin = typeof body?.origin === "string" && ALLOWED_ORIGIN.test(body.origin) ? body.origin : "https://muhazidentalclinic.org";
    const payload = b64url(enc.encode(JSON.stringify({ uid: u.user.id, origin, exp: Date.now() + 10 * 60_000 })));
    const state = `${payload}.${await sign(payload)}`;
    const url = `https://www.facebook.com/v21.0/dialog/oauth?${new URLSearchParams({
      client_id: APP_ID, redirect_uri: REDIRECT, state, scope: SCOPES, response_type: "code",
    })}`;
    return json({ url });
  }

  // ---------- Step 2: Meta redirects back here ----------
  const q = new URL(req.url).searchParams;
  const [payload, sig] = (q.get("state") ?? "").split(".");
  let origin = "https://muhazidentalclinic.org";
  const back = (status: string, msg = "") =>
    Response.redirect(`${origin}/admin/social-hub?meta=${status}${msg ? `&msg=${encodeURIComponent(msg.slice(0, 200))}` : ""}`, 302);
  try {
    if (!payload || !sig || sig !== (await sign(payload))) return json({ error: "Invalid state" }, 400);
    const st = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    origin = st.origin;
    if (Date.now() > st.exp) return back("error", "Link expired, try again");
    if (q.get("error")) return back("error", q.get("error_description") ?? "Cancelled");
    const code = q.get("code");
    if (!code) return back("error", "No code returned");

    const short = await g("oauth/access_token", { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT, code });
    const long = await g("oauth/access_token", {
      grant_type: "fb_exchange_token", client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: short.access_token,
    });
    const userToken: string = long.access_token;
    const expiresAt = long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;

    const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();
    const summary: string[] = [];
    const save = async (platform: string, conn: Record<string, unknown>, token: string | null, externalId: string | null, exp: string | null) => {
      await admin.from("social_connections").update({ ...conn, status: "connected", last_checked_at: now, updated_by: st.uid }).eq("platform", platform);
      if (token) await admin.from("social_tokens").upsert({ platform, access_token: token, external_id: externalId, expires_at: exp, updated_at: now });
      summary.push(platform);
    };

    // Facebook Page + linked Instagram (page tokens from a long-lived user token don't expire)
    const pages = await g("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", access_token: userToken });
    const page = pages.data?.[0];
    if (page) {
      await save("facebook", { account_name: page.name, page_id: page.id, account_id: page.id }, page.access_token, page.id, null);
      const ig = page.instagram_business_account;
      if (ig) await save("instagram", { account_name: ig.username, account_id: ig.id, page_id: page.id }, page.access_token, ig.id, null);
    }

    // WhatsApp Business Account from the granted permissions
    const dbg = await g("debug_token", { input_token: userToken, access_token: `${APP_ID}|${APP_SECRET}` });
    const waba = (dbg.data?.granular_scopes ?? []).find((s: any) => s.scope === "whatsapp_business_management")?.target_ids?.[0];
    if (waba) {
      const phones = await g(`${waba}/phone_numbers`, { fields: "id,display_phone_number,verified_name", access_token: userToken }).catch(() => ({ data: [] }));
      const ph = phones.data?.[0];
      await save("whatsapp", { account_name: ph ? `${ph.verified_name} (${ph.display_phone_number})` : "WhatsApp Business", account_id: waba, page_id: ph?.id ?? null }, userToken, ph?.id ?? waba, expiresAt);
    }

    await admin.from("activity_logs").insert({ user_id: st.uid, action: "social.meta_connected", entity_type: "social_connection", details: { platforms: summary } });
    if (!summary.length) return back("error", "No Page, Instagram or WhatsApp account was shared during login");
    return back("connected", summary.join(","));
  } catch (e) {
    console.error("meta-connect error:", e);
    return back("error", e instanceof Error ? e.message : "Unexpected error");
  }
});
