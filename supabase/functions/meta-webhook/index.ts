import { adminClient, checked, corsHeaders, json } from '../_shared/social-server.ts';
import { parseEvents, validSignature } from '../_shared/social-rules.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = adminClient();
    if (req.method === 'GET') {
      const q = new URL(req.url).searchParams;
      const token = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
      if (!token || q.get('hub.mode') !== 'subscribe' || q.get('hub.verify_token') !== token || !q.get('hub.challenge')) return json({ error: 'Verification failed' }, 403);
      for (const platform of ['facebook', 'instagram']) checked(await admin.from('social_delivery_state').upsert({ platform, verified_at: new Date().toISOString() }));
      return new Response(q.get('hub.challenge'), { headers: corsHeaders });
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const raw = new Uint8Array(await req.arrayBuffer());
    if (raw.length > 2_000_000) return json({ error: 'Payload too large' }, 413);
    if (!await validSignature(raw, req.headers.get('x-hub-signature-256'), Deno.env.get('META_APP_SECRET') ?? '')) return json({ error: 'Invalid signature' }, 403);
    let payload;
    try { payload = JSON.parse(new TextDecoder().decode(raw)); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const events = parseEvents(payload);
    for (const e of events) {
      const connection = checked(await admin.from('social_connections').select('account_id,page_id').eq('platform', e.platform).eq('status', 'connected').maybeSingle());
      if (!connection || ![connection.account_id, connection.page_id].includes(e.account)) continue;
      const key = `${e.platform}:${e.id}:${e.verb}`;
      const logged = checked(await admin.from('social_activity').select('id').eq('event_key', key).maybeSingle());
      if (logged) continue;
      let thread = checked(await admin.from('social_conversations').select('*').eq('platform', e.platform).eq('account_id', e.account).eq('external_thread_id', e.thread).maybeSingle());
      if (!thread) thread = checked(await admin.from('social_conversations').upsert({ platform: e.platform, account_id: e.account, external_thread_id: e.thread, kind: e.kind, participant_id: e.sender, participant_name: e.name }, { onConflict: 'platform,account_id,external_thread_id', ignoreDuplicates: true }).select().maybeSingle()) ?? checked(await admin.from('social_conversations').select('*').eq('platform', e.platform).eq('account_id', e.account).eq('external_thread_id', e.thread).single());
      const existing = checked(await admin.from('social_messages').select('id').eq('platform', e.platform).eq('external_id', e.id).maybeSingle());
      if (e.deleted || e.verb === 'edited') {
        if (existing) checked(await admin.from('social_messages').update({ is_deleted: e.deleted, ...(e.deleted ? {} : { body: e.body }) }).eq('id', existing.id));
      } else if (!existing) {
        checked(await admin.from('social_messages').upsert({ conversation_id: thread.id, platform: e.platform, external_id: e.id, sender_id: e.sender, sender_name: e.name, direction: e.direction, kind: e.kind, body: e.body, attachments: e.attachments, parent_id: e.parent, occurred_at: e.time }, { onConflict: 'platform,external_id', ignoreDuplicates: true }));
      }
      if (Date.parse(e.time) >= Date.parse(thread.last_event_at) || !existing) {
        const latest = Date.parse(e.time) > Date.parse(thread.last_event_at) ? e.time : thread.last_event_at;
        const inbound = e.direction === 'inbound' && !e.deleted;
        checked(await admin.from('social_conversations').update({ last_event_at: latest, ...(inbound ? { last_inbound_at: !thread.last_inbound_at || e.time > thread.last_inbound_at ? e.time : thread.last_inbound_at, status: 'open', participant_name: e.name, participant_id: e.sender } : {}) }).eq('id', thread.id));
      }
      checked(await admin.from('social_activity').upsert({ platform: e.platform, action: e.deleted ? 'comment.removed' : `${e.kind}.${e.direction === 'inbound' ? 'received' : 'sent'}`, conversation_id: thread.id, event_key: key, details: { external_id: e.id } }, { onConflict: 'event_key', ignoreDuplicates: true }));
      checked(await admin.from('social_delivery_state').upsert({ platform: e.platform, last_received_at: new Date().toISOString(), last_error: null }));
    }
    return json({ received: true });
  } catch (error) {
    console.error('Meta webhook persistence failed');
    return json({ error: 'Could not persist delivery; retry required' }, 500);
  }
});