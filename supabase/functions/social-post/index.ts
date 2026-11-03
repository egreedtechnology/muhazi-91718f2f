// Publishes a caption + photo to the clinic's Facebook Page and/or Instagram. Social Hub roles only.
import { activity, adminClient, authorize, checked, corsHeaders, json } from '../_shared/social-server.ts';

const GRAPH = 'https://graph.facebook.com/v21.0';
async function g(path: string, params: Record<string, string>, method = 'POST') {
  const qs = new URLSearchParams(params);
  const res = await fetch(method === 'GET' ? `${GRAPH}/${path}?${qs}` : `${GRAPH}/${path}`, { method, body: method === 'GET' ? undefined : qs });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Meta: ${data?.error?.message ?? res.status}`);
  return data;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = adminClient();
  let user;
  try { user = await authorize(req, admin); } catch (e) {
    return json({ error: (e as Error).message === 'Forbidden' ? 'You do not have Social Hub access' : 'Please sign in again' }, 401);
  }
  const body = await req.json().catch(() => ({}));
  const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
  const image = typeof body.image_url === 'string' ? body.image_url : '';
  const platforms: string[] = Array.isArray(body.platforms) ? body.platforms.filter((p: string) => ['facebook', 'instagram'].includes(p)) : [];
  if (!caption || caption.length > 2200) return json({ error: 'Caption must be 1–2200 characters' }, 400);
  if (!platforms.length) return json({ error: 'Choose Facebook and/or Instagram' }, 400);
  if (image && !image.startsWith('https://')) return json({ error: 'Invalid photo' }, 400);
  if (platforms.includes('instagram') && !image) return json({ error: 'Instagram needs a photo' }, 400);

  const tokens = checked(await admin.from('social_tokens').select('platform,access_token,external_id').in('platform', platforms));
  const results: Record<string, { ok: boolean; url?: string; error?: string }> = {};
  for (const p of platforms) {
    const t = tokens.find((x: any) => x.platform === p);
    if (!t?.external_id) { results[p] = { ok: false, error: `${p} is not connected` }; continue; }
    try {
      if (p === 'facebook') {
        const r = image
          ? await g(`${t.external_id}/photos`, { url: image, caption, access_token: t.access_token })
          : await g(`${t.external_id}/feed`, { message: caption, access_token: t.access_token });
        const postId = r.post_id ?? r.id;
        const info = await g(postId, { fields: 'permalink_url', access_token: t.access_token }, 'GET').catch(() => ({}));
        results[p] = { ok: true, url: info.permalink_url ?? `https://www.facebook.com/${postId}` };
      } else {
        const c = await g(`${t.external_id}/media`, { image_url: image, caption, access_token: t.access_token });
        for (let i = 0; i < 15; i++) {
          const s = await g(c.id, { fields: 'status_code', access_token: t.access_token }, 'GET');
          if (s.status_code === 'FINISHED') break;
          if (s.status_code === 'ERROR') throw new Error('Instagram could not process the photo (use JPG or PNG under 8MB)');
          await new Promise(r => setTimeout(r, 2000));
        }
        const pub = await g(`${t.external_id}/media_publish`, { creation_id: c.id, access_token: t.access_token });
        const info = await g(pub.id, { fields: 'permalink', access_token: t.access_token }, 'GET').catch(() => ({}));
        results[p] = { ok: true, url: info.permalink };
      }
      await activity(admin, p, 'post.published', user.uid, null, { url: results[p].url ?? null, source: body.source ?? 'composer' });
    } catch (e) {
      const m = (e as Error).message;
      results[p] = { ok: false, error: m.startsWith('Meta') || m.startsWith('Instagram') ? m : 'Publishing failed' };
      await activity(admin, p, 'post.failed', user.uid, null, { error: results[p].error });
    }
  }
  return json({ results });
});
