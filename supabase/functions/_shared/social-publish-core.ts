// Shared Facebook/Instagram publisher used by immediate posts and the scheduler.
import { waitForInstagram } from './social-publishing.ts';

const GRAPH = 'https://graph.facebook.com/v21.0';
export async function g(path: string, params: Record<string, string>, method = 'POST') {
  const qs = new URLSearchParams(params);
  const res = await fetch(method === 'GET' ? `${GRAPH}/${path}?${qs}` : `${GRAPH}/${path}`, { method, body: method === 'GET' ? undefined : qs });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Meta: ${data?.error?.message ?? res.status}`);
  return data;
}

export type MediaType = 'none' | 'image' | 'video';
export type Result = { ok: boolean; url?: string; error?: string };

export async function publishTo(
  admin: any, platforms: string[], caption: string, media: string, mediaType: MediaType, articleUrl = '',
): Promise<Record<string, Result>> {
  const { data: tokens, error } = await admin.from('social_tokens').select('platform,access_token,external_id').in('platform', platforms);
  if (error) throw new Error(error.message);
  const results: Record<string, Result> = {};
  for (const p of platforms) {
    const t = (tokens ?? []).find((x: any) => x.platform === p);
    if (!t?.external_id) { results[p] = { ok: false, error: `${p} is not connected` }; continue; }
    const tk = t.access_token;
    try {
      if (p === 'facebook') {
        let id: string;
        if (mediaType === 'video') {
          const r = await g(`${t.external_id}/videos`, { file_url: media, description: caption, access_token: tk });
          id = r.id;
          results[p] = { ok: true, url: `https://www.facebook.com/${t.external_id}/videos/${id}` };
          continue;
        }
        const r = mediaType === 'image'
          ? await g(`${t.external_id}/photos`, { url: media, caption, access_token: tk })
          : await g(`${t.external_id}/feed`, { message: caption, ...(articleUrl ? { link: articleUrl } : {}), access_token: tk });
        id = r.post_id ?? r.id;
        const info = await g(id, { fields: 'permalink_url', access_token: tk }, 'GET').catch(() => ({}));
        results[p] = { ok: true, url: info.permalink_url ?? `https://www.facebook.com/${id}` };
      } else {
        if (mediaType === 'none') { results[p] = { ok: false, error: 'Instagram needs a photo or video' }; continue; }
        const params: Record<string, string> = mediaType === 'video'
          ? { media_type: 'REELS', video_url: media, caption, access_token: tk }
          : { image_url: media, caption, access_token: tk };
        const c = await g(`${t.external_id}/media`, params);
        const video = mediaType === 'video';
        await waitForInstagram(async () => (await g(c.id, { fields: 'status_code', access_token: tk }, 'GET')).status_code,
          () => new Promise<void>(r => setTimeout(r, video ? 5000 : 2000)), video ? 24 : 15);
        const pub = await g(`${t.external_id}/media_publish`, { creation_id: c.id, access_token: tk });
        const info = await g(pub.id, { fields: 'permalink', access_token: tk }, 'GET').catch(() => ({}));
        results[p] = { ok: true, url: info.permalink };
      }
    } catch (e) {
      const m = (e as Error).message;
      results[p] = { ok: false, error: m.startsWith('Meta') || m.startsWith('Instagram') ? m : 'Publishing failed' };
    }
  }
  return results;
}
