// Staff admin edge function — all privileged staff operations
// Auth: caller must have super_admin or manager role
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function requireManager(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Missing authorization", status: 401 };
  const { data: userData, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !userData?.user) return { error: "Unauthorized", status: 401 };
  const uid = userData.user.id;
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid);
  const allowed = (roles ?? []).some((r: any) =>
    ["super_admin", "manager"].includes(r.role),
  );
  if (!allowed) return { error: "Forbidden", status: 403 };
  return { uid, user: userData.user };
}

async function logActivity(
  actorId: string,
  action: string,
  entity_type: string,
  entity_id: string | null,
  details: Record<string, unknown>,
) {
  try {
    await admin.from("activity_logs").insert({
      user_id: actorId,
      action,
      entity_type,
      entity_id,
      details,
    });
  } catch (_) {
    /* ignore */
  }
}

async function requireAuth(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Missing authorization", status: 401 };
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return { error: "Unauthorized", status: 401 };
  return { uid: userData.user.id, user: userData.user };
}

const SELF_ACTIONS = new Set(["activate_self", "get_invite_status"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { action, payload = {} } = await req.json();

    // Actions the invited user calls for themselves (no manager gate).
    if (SELF_ACTIONS.has(action)) {
      const auth = await requireAuth(req);
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const selfId = auth.uid;
      const selfUser = auth.user;

      if (action === "get_invite_status") {
        const { data: staff } = await admin
          .from("staff")
          .select("id, status, last_login_at, full_name")
          .eq("user_id", selfId)
          .maybeSingle();
        return json({
          user_id: selfId,
          email: selfUser.email ?? null,
          full_name: staff?.full_name ?? selfUser.user_metadata?.full_name ?? null,
          status: staff?.status ?? null,
          already_activated:
            !!staff && staff.status === "active" && !!staff.last_login_at,
        });
      }

      if (action === "activate_self") {
        const nowIso = new Date().toISOString();
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", selfId);
        await admin
          .from("staff")
          .update({
            status: "active",
            is_active: true,
            last_login_at: nowIso,
            activated_at: nowIso,
          })
          .eq("user_id", selfId);
        await logActivity(selfId, "staff.activated", "staff", null, {
          via: "set_password",
        });
        return json({
          ok: true,
          roles: (roles ?? []).map((r: any) => r.role),
        });
      }
    }

    const gate = await requireManager(req);
    if ("error" in gate) return json({ error: gate.error }, gate.status);
    const actorId = gate.uid;

    switch (action) {
      case "search_users": {
        const q = String(payload.query ?? "").trim().toLowerCase();
        const { data: users } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const { data: staffRows } = await admin
          .from("staff")
          .select("user_id, full_name, avatar_url");
        const staffMap = new Map(
          (staffRows ?? [])
            .filter((s: any) => s.user_id)
            .map((s: any) => [s.user_id, s]),
        );
        const { data: rolesRows } = await admin
          .from("user_roles")
          .select("user_id, role");
        const rolesMap = new Map<string, string[]>();
        (rolesRows ?? []).forEach((r: any) => {
          const arr = rolesMap.get(r.user_id) ?? [];
          arr.push(r.role);
          rolesMap.set(r.user_id, arr);
        });

        const results = (users?.users ?? [])
          .map((u: any) => {
            const s = staffMap.get(u.id) as any;
            const name =
              s?.full_name ??
              u.user_metadata?.full_name ??
              u.email ??
              "Unknown";
            return {
              user_id: u.id,
              email: u.email ?? null,
              phone: u.phone ?? null,
              full_name: name,
              avatar_url: s?.avatar_url ?? null,
              roles: rolesMap.get(u.id) ?? [],
              last_sign_in_at: u.last_sign_in_at ?? null,
            };
          })
          .filter((r) => {
            if (!q) return true;
            return (
              r.full_name.toLowerCase().includes(q) ||
              (r.email ?? "").toLowerCase().includes(q) ||
              (r.phone ?? "").toLowerCase().includes(q)
            );
          })
          .slice(0, 25);

        return json({ results });
      }

      case "invite_staff": {
        const {
          full_name,
          email,
          phone,
          department,
          position,
          role,
        } = payload;
        if (!full_name || !email || !role)
          return json({ error: "Missing required fields" }, 400);

        const redirectTo = payload.redirectTo ?? undefined;
        const { data: inv, error: invErr } =
          await admin.auth.admin.inviteUserByEmail(email, {
            data: { full_name, phone },
            redirectTo,
          });
        if (invErr) return json({ error: invErr.message }, 400);

        const newUserId = inv.user?.id;
        if (newUserId) {
          await admin.from("staff").upsert(
            {
              user_id: newUserId,
              full_name,
              email,
              phone: phone ?? null,
              department: department ?? null,
              position: position ?? null,
              specialization: position ?? null,
              status: "pending",
              is_active: true,
              invited_at: new Date().toISOString(),
              invited_by: actorId,
            },
            { onConflict: "user_id" },
          );
          await admin
            .from("user_roles")
            .upsert(
              { user_id: newUserId, role },
              { onConflict: "user_id,role" },
            );
        }

        await logActivity(actorId, "staff.invited", "staff", newUserId ?? null, {
          email,
          role,
        });
        return json({ ok: true, user_id: newUserId });
      }

      case "assign_role": {
        const { user_id, role } = payload;
        if (!user_id || !role) return json({ error: "Missing fields" }, 400);
        const { error } = await admin
          .from("user_roles")
          .upsert(
            { user_id, role },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );
        if (error) return json({ error: error.message }, 400);
        await logActivity(actorId, "role.assigned", "user_roles", user_id, {
          role,
        });
        return json({ ok: true });
      }

      case "remove_role": {
        const { user_id, role } = payload;
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", role);
        if (error) return json({ error: error.message }, 400);
        await logActivity(actorId, "role.removed", "user_roles", user_id, {
          role,
        });
        return json({ ok: true });
      }

      case "set_status": {
        const { staff_id, status } = payload;
        if (!["active", "pending", "suspended", "disabled"].includes(status))
          return json({ error: "Invalid status" }, 400);
        const { error } = await admin
          .from("staff")
          .update({ status, is_active: status === "active" })
          .eq("id", staff_id);
        if (error) return json({ error: error.message }, 400);
        await logActivity(actorId, "staff.status", "staff", staff_id, {
          status,
        });
        return json({ ok: true });
      }

      case "reset_password": {
        const { email } = payload;
        if (!email) return json({ error: "Missing email" }, 400);
        const { error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        if (error) return json({ error: error.message }, 400);
        await logActivity(actorId, "password.reset", "auth", null, { email });
        return json({ ok: true });
      }

      case "delete_staff": {
        const { staff_id, user_id, delete_auth } = payload;
        if (user_id)
          await admin.from("user_roles").delete().eq("user_id", user_id);
        if (staff_id) await admin.from("staff").delete().eq("id", staff_id);
        if (delete_auth && user_id) {
          await admin.auth.admin.deleteUser(user_id).catch(() => {});
        }
        await logActivity(actorId, "staff.deleted", "staff", staff_id ?? null, {
          user_id,
          delete_auth: !!delete_auth,
        });
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("staff-admin error", e);
    return json({ error: "Internal error" }, 500);
  }
});
