// Publishes scheduled posts that are due. Called every 5 minutes by a cron job.
// Only posts that Social Hub staff already scheduled can be published, so no caller identity is needed.
import { activity, adminClient, corsHeaders, json } from '../_shared/social-server.ts';
import { publishTo, type MediaType } from '../_shared/social-publish-core.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = adminClient();
    const { data: due, error } = await admin.from('social_scheduled_posts').select('id')
      .eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3);
    if (error) throw error;
    let done = 0;
    for (const { id } of due ?? []) {
      // Claim atomically so overlapping runs never double-post.
      const { data: row } = await admin.from('social_scheduled_posts').update({ status: 'publishing' })
        .eq('id', id).eq('status', 'scheduled').select('*').maybeSingle();
      if (!row) continue;
      let results: Record<string, any>;
      try { results = await publishTo(admin, row.platforms, row.caption, row.media_url ?? '', row.media_type as MediaType); }
      catch (e) { results = Object.fromEntries(row.platforms.map((p: string) => [p, { ok: false, error: (e as Error).message }])); }
      const oks = Object.values(results).filter((r: any) => r.ok).length;
      const status = oks === row.platforms.length ? 'published' : oks ? 'partial' : 'failed';
      await admin.from('social_scheduled_posts').update({ status, results, published_at: oks ? new Date().toISOString() : null }).eq('id', id);
      for (const [p, r] of Object.entries(results)) {
        await activity(admin, p, r.ok ? 'post.published' : 'post.failed', row.created_by, null,
          r.ok ? { url: r.url ?? null, source: 'schedule', scheduled_id: id } : { error: r.error, scheduled_id: id }).catch(() => {});
      }
      done++;
    }
    return json({ processed: done });
  } catch (e) { console.error('scheduler', (e as Error).message); return json({ error: 'Scheduler failed' }, 500); }
});
