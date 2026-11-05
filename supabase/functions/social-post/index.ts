// Publishes (or schedules) a caption + photo/video to the clinic's Facebook Page and/or Instagram. Social Hub roles only.
import { activity, adminClient, authorize, checked, corsHeaders, json } from '../_shared/social-server.ts';
import { publishingInput } from '../_shared/social-publishing.ts';
import { publishTo, type MediaType } from '../_shared/social-publish-core.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
  const admin = adminClient();
  let user;
  try { user = await authorize(req, admin); } catch (e) {
    const forbidden = (e as Error).message === 'Forbidden';
    return json({ error: forbidden ? 'You do not have Social Hub access' : 'Please sign in again' }, forbidden ? 403 : 401);
  }
  const body = await req.json().catch(() => ({}));
  let input;
  try { input = publishingInput(body); } catch (e) { return json({ error: (e as Error).message }, 400); }
  let { caption } = input;
  const { platforms } = input;
  const video = typeof body.video_url === 'string' ? body.video_url : '';
  const image = typeof body.image_url === 'string' ? body.image_url : '';
  const media = video || image;
  const mediaType: MediaType = video ? 'video' : image ? 'image' : 'none';
  let articleUrl = '';
  if (body.postId) {
    if (typeof body.postId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.postId)) return json({ error: 'Invalid article' }, 400);
    const post = checked(await admin.from('blog_posts').select('slug,is_published').eq('id', body.postId).maybeSingle());
    if (!post?.is_published) return json({ error: 'Choose a published article' }, 400);
    articleUrl = `https://muhazidentalclinic.org/blog/${post.slug}`;
    if (!caption.includes(articleUrl)) caption += `\n\n${articleUrl}`;
    if (caption.length > 2200) return json({ error: 'Shorten the caption to leave space for the article link' }, 400);
  }
  if (media && !media.startsWith('https://')) return json({ error: 'Invalid media' }, 400);
  if (platforms.includes('instagram') && !media) return json({ error: 'Instagram needs a photo or video' }, 400);

  if (body.scheduled_at) {
    const when = new Date(body.scheduled_at);
    if (isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) return json({ error: 'Choose a time at least 1 minute from now' }, 400);
    if (when.getTime() > Date.now() + 180 * 86400_000) return json({ error: 'Schedule within the next 6 months' }, 400);
    const row = checked(await admin.from('social_scheduled_posts').insert({
      caption, media_url: media || null, media_type: mediaType, platforms, scheduled_at: when.toISOString(), created_by: user.uid,
    }).select('id').single());
    await activity(admin, null, 'post.scheduled', user.uid, null, { id: row.id, platforms, scheduled_at: when.toISOString() }).catch(() => {});
    return json({ scheduled: true, id: row.id });
  }

  const results = await publishTo(admin, platforms, caption, media, mediaType, articleUrl);
  for (const [p, r] of Object.entries(results)) {
    await activity(admin, p, r.ok ? 'post.published' : 'post.failed', user.uid, null,
      r.ok ? { url: r.url ?? null, media: mediaType, source: body.postId ? 'blog' : 'composer', post_id: body.postId ?? null } : { error: r.error })
      .catch(() => console.error('Social publishing audit write failed'));
  }
  return json({ results });
  } catch { return json({ error: 'Publishing is unavailable. Please try again later.' }, 500); }
});
