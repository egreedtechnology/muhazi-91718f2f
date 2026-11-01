import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { canUseSocial } from './social-rules.ts';
export { corsHeaders };
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Social service is not configured');
  return createClient(url, key);
}
export function checked(result: any) { if (result.error) throw new Error(result.error.message); return result.data; }
export async function authorize(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user) throw new Error('Unauthorized');
  const roles = checked(await admin.from('user_roles').select('role').eq('user_id', data.user.id)).map((r: any) => r.role);
  const statuses = checked(await admin.from('staff').select('status').eq('user_id', data.user.id)).map((s: any) => s.status);
  if (!canUseSocial(roles, statuses)) throw new Error('Forbidden');
  return { uid: data.user.id, manager: roles.some((r: string) => ['super_admin', 'manager'].includes(r)) };
}
export async function graph(path: string, token: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (!response.ok || data.error) {
    // Never log the request, token or provider URLs that can contain credentials.
    const detail = data.error?.message ?? 'Meta returned an unreadable response';
    throw new Error(`Meta [${response.status}]: ${detail}`);
  }
  return data;
}
export async function activity(admin: ReturnType<typeof adminClient>, platform: string | null, action: string, uid: string | null, conversation: string | null, details: object = {}) {
  checked(await admin.from('social_activity').insert({ platform, action, actor_id: uid, conversation_id: conversation, details }));
}