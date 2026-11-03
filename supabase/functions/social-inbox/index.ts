import { activity, adminClient, authorize, canReplyCheck, checked, corsHeaders, graph, json } from './deps.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = adminClient();
  let user;
  try { user = await authorize(req, admin); } catch (e) {
    const m = (e as Error).message;
    return json({ error: m === 'Forbidden' ? 'You do not have Social Hub access' : 'Please sign in again' }, m === 'Forbidden' ? 403 : 401);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body.conversation_id === 'string' ? body.conversation_id : '';
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'Invalid conversation' }, 400);
    const thread = checked(await admin.from('social_conversations').select('*').eq('id', id).maybeSingle());
    if (!thread) return json({ error: 'Conversation not found' }, 404);

    if (body.action === 'read') {
      checked(await admin.from('social_conversations').update({ read_at: new Date().toISOString() }).eq('id', id));
      return json({ ok: true });
    }
    if (body.action === 'status') {
      if (!['open', 'closed'].includes(body.status)) return json({ error: 'Invalid status' }, 400);
      checked(await admin.from('social_conversations').update({ status: body.status }).eq('id', id));
      await activity(admin, thread.platform, `conversation.${body.status}`, user.uid, id);
      return json({ ok: true });
    }
    if (body.action !== 'reply') return json({ error: 'Unknown action' }, 400);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 1000) return json({ error: 'Reply must be 1–1000 characters' }, 400);
    if (!canReplyCheck(thread.kind, thread.last_inbound_at)) return json({ error: 'Meta only allows replies within 24 hours of the patient’s last message' }, 422);
    const tok = checked(await admin.from('social_tokens').select('access_token').eq('platform', thread.platform).maybeSingle());
    if (!tok) return json({ error: `${thread.platform} is not connected` }, 422);
    const conn = checked(await admin.from('social_connections').select('page_id').eq('platform', 'facebook').maybeSingle());

    let externalId: string;
    if (thread.kind === 'comment') {
      const last = checked(await admin.from('social_messages').select('external_id').eq('conversation_id', id).eq('direction', 'inbound').order('occurred_at', { ascending: false }).limit(1).maybeSingle());
      if (!last) return json({ error: 'No comment to reply to' }, 422);
      const edge = thread.platform === 'instagram' ? 'replies' : 'comments';
      externalId = (await graph(`${last.external_id}/${edge}`, tok.access_token, 'POST', { message: text })).id;
    } else {
      const sendFrom = conn?.page_id ?? thread.account_id;
      const r = await graph(`${sendFrom}/messages`, tok.access_token, 'POST', { recipient: { id: thread.participant_id }, messaging_type: 'RESPONSE', message: { text } });
      externalId = r.message_id;
    }
    const now = new Date().toISOString();
    checked(await admin.from('social_messages').upsert({ conversation_id: id, platform: thread.platform, external_id: externalId, sender_name: 'Clinic', direction: 'outbound', kind: thread.kind, body: text, attachments: [], sent_by: user.uid, occurred_at: now }, { onConflict: 'platform,external_id', ignoreDuplicates: true }));
    checked(await admin.from('social_conversations').update({ last_event_at: now, read_at: now }).eq('id', id));
    await activity(admin, thread.platform, `${thread.kind}.replied`, user.uid, id);
    return json({ ok: true });
  } catch (e) {
    const m = (e as Error).message;
    console.error('social-inbox failed', m.startsWith('Meta') ? m : 'internal');
    return json({ error: m.startsWith('Meta') ? m : 'Could not complete the action' }, 502);
  }
});
