// Reads recent posts from the connected Facebook Page and Instagram account. Social Hub roles only.
import { adminClient, authorize, checked, corsHeaders, json } from '../_shared/social-server.ts';
import { g } from '../_shared/social-publish-core.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = adminClient();
    try { await authorize(req, admin); } catch (e) {
      const forbidden = (e as Error).message === 'Forbidden';
      return json({ error: forbidden ? 'You do not have Social Hub access' : 'Please sign in again' }, forbidden ? 403 : 401);
    }
    const tokens = checked(await admin.from('social_tokens').select('platform,access_token,external_id').in('platform', ['facebook', 'instagram']));
    const posts: any[] = [];
    const errors: Record<string, string> = {};
    for (const t of tokens) {
      if (!t.external_id) continue;
      try {
        if (t.platform === 'facebook') {
          const r = await g(`${t.external_id}/published_posts`, {
            fields: 'id,message,created_time,permalink_url,full_picture,attachments{media_type},reactions.summary(true).limit(0),comments.summary(true).limit(0),shares',
            limit: '25', access_token: t.access_token }, 'GET');
          for (const p of r.data ?? []) posts.push({
            platform: 'facebook', id: p.id, text: p.message ?? '', time: p.created_time, url: p.permalink_url,
            image: p.full_picture ?? null, type: p.attachments?.data?.[0]?.media_type ?? 'status',
            likes: p.reactions?.summary?.total_count ?? 0, comments: p.comments?.summary?.total_count ?? 0, shares: p.shares?.count ?? 0,
          });
        } else {
          const r = await g(`${t.external_id}/media`, {
            fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            limit: '25', access_token: t.access_token }, 'GET');
          for (const p of r.data ?? []) posts.push({
            platform: 'instagram', id: p.id, text: p.caption ?? '', time: p.timestamp, url: p.permalink,
            image: p.media_type === 'VIDEO' ? p.thumbnail_url ?? null : p.media_url ?? null, type: String(p.media_type ?? '').toLowerCase(),
            likes: p.like_count ?? 0, comments: p.comments_count ?? 0, shares: 0,
          });
        }
      } catch (e) { errors[t.platform] = (e as Error).message; }
    }
    posts.sort((a, b) => +new Date(b.time) - +new Date(a.time));
    return json({ posts, errors });
  } catch { return json({ error: 'Could not load posts' }, 500); }
});
