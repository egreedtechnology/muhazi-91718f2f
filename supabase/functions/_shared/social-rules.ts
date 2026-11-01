export function canUseSocial(roles: string[], statuses: string[]) {
  return roles.some(r => ['super_admin', 'manager', 'receptionist'].includes(r)) && !statuses.some(s => ['pending', 'suspended', 'disabled'].includes(s));
}
export function canReply(kind: string, lastInbound: string | null, now = Date.now()) {
  return kind === 'comment' || (lastInbound !== null && now - Date.parse(lastInbound) < 24 * 60 * 60 * 1000 && now >= Date.parse(lastInbound));
}
export async function validSignature(raw: Uint8Array, signature: string | null, secret: string) {
  if (!signature?.match(/^sha256=[a-f0-9]{64}$/) || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', key, raw));
  const expected = signature.slice(7);
  let difference = 0;
  for (let i = 0; i < result.length; i++) difference |= result[i] ^ parseInt(expected.slice(i * 2, i * 2 + 2), 16);
  return difference === 0;
}
export type SocialEvent = { platform: string; account: string; id: string; thread: string; kind: string; sender: string; name: string; direction: string; body: string; attachments: unknown[]; parent: string | null; time: string; deleted: boolean; verb: string };
export function parseEvents(payload: any): SocialEvent[] {
  if (!['page', 'instagram'].includes(payload?.object) || !Array.isArray(payload.entry)) return [];
  const platform = payload.object === 'page' ? 'facebook' : 'instagram';
  const events: SocialEvent[] = [];
  for (const entry of payload.entry) {
    if (typeof entry.id !== 'string') continue;
    for (const item of entry.messaging ?? []) {
      const message = item.message;
      if (!message?.mid || !item.sender?.id || !item.recipient?.id) continue;
      const outbound = message.is_echo === true || item.sender.id === entry.id;
      const participant = outbound ? item.recipient.id : item.sender.id;
      events.push({ platform, account: entry.id, id: message.mid, thread: `dm:${participant}`, kind: 'message', sender: item.sender.id, name: outbound ? 'Clinic' : 'Social contact', direction: outbound ? 'outbound' : 'inbound', body: message.text ?? '', attachments: (message.attachments ?? []).map((a: any) => ({ type: a.type, url: a.payload?.url })).filter((a: any) => a.url), parent: null, time: new Date(item.timestamp ?? Date.now()).toISOString(), deleted: message.is_deleted === true, verb: message.is_deleted ? 'remove' : 'add' });
    }
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v || !(change.field === 'comments' || (change.field === 'feed' && v.item === 'comment'))) continue;
      const id = v.comment_id ?? v.id;
      if (!id) continue;
      const sender = v.from?.id ?? v.sender_id ?? '';
      events.push({ platform, account: entry.id, id, thread: `comment:${v.post_id ?? v.media?.id ?? v.parent_id ?? id}`, kind: 'comment', sender, name: v.from?.name ?? v.from?.username ?? 'Social contact', direction: sender === entry.id ? 'outbound' : 'inbound', body: v.message ?? v.text ?? '', attachments: [], parent: v.parent_id ?? null, time: new Date((v.created_time ?? entry.time ?? Date.now() / 1000) * 1000).toISOString(), deleted: v.verb === 'remove', verb: v.verb ?? 'add' });
    }
  }
  return events;
}