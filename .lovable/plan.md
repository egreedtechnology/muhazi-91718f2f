## Staff Account Management — Implementation Plan

Replaces the "Enter User UUID" flow with a searchable, professional Staff Accounts page under Administration. Because Supabase's `auth.users` table is not accessible from the browser (anon key), all admin-only operations (list users, invite, reset password, suspend, delete) run through a secure **Edge Function** guarded by `is_staff` + `super_admin` role check.

---

### 1. Database (migration)

Extend the existing `staff` table (source of truth for profiles) — keep it lean, no duplicate profile tables:

- `department text` — e.g. "Clinical", "Administration", "IT"
- `position text` — free-text job title
- `status text` — enum-like: `active | pending | suspended | disabled` (default `pending`)
- `last_login_at timestamptz`
- `invited_at timestamptz`
- `invited_by uuid`

Extend `app_role` enum with additional roles:
`manager`, `dental_assistant`, `it_admin`, `cashier`, `lab_technician`, `pharmacist`, `nurse`, `cleaner`, `security_guard`
(keeps existing `super_admin`, `dentist`, `receptionist`, `accountant`)

New helper: `has_any_role(_user_id, variadic app_role[])` for RBAC in RLS.

Update `is_staff()` to include the new staff-side roles.

RLS updates:
- `staff` — managers + super_admins can insert/update/delete; all staff can select.
- `user_roles` — only `super_admin` and `manager` can insert/update/delete.
- `activity_logs` — already logs actions; add helper to insert from edge function.

### 2. Edge function: `staff-admin`

Single function with actions (POST body `{ action, payload }`), all authorized via JWT + super_admin/manager check using service-role client:

- `search_users` — searches `auth.users` (via admin API) + `staff` by name/email/phone, returns unified results
- `invite_staff` — `auth.admin.inviteUserByEmail`, then upsert into `staff` with `status='pending'`, create `user_roles` row
- `assign_role` — insert/replace `user_roles` for a given `user_id`
- `remove_role` — delete `user_roles` row
- `set_status` — update `staff.status` (active/suspended/disabled)
- `reset_password` — `auth.admin.generateLink({type:'recovery'})` → send email
- `delete_staff` — remove `user_roles`, `staff`, and optionally the auth user
- Each action writes to `activity_logs`.

Uses `SUPABASE_SERVICE_ROLE_KEY` (already available). CORS handled.

### 3. Frontend — new page `/admin/staff-accounts`

Replaces (or complements) the current Staff Management. Route added to `App.tsx`, sidebar entry "Staff Accounts" under **System** (super_admin + manager only). Old `/admin/staff` remains for legacy team-profile editing.

Components:

- **StaffAccounts.tsx** — main page:
  - Top filters chips: All / Dentists / Managers / Receptionists / IT / Active / Pending / Suspended
  - Global search input (name, email, phone, role, department)
  - Grid of staff cards (avatar with initials fallback, name, email, phone, department, role badge, colored status dot, last login)
  - Actions per card: Edit • Assign Role • Suspend/Activate • Reset Password • Delete
  - Pagination (20/page)
  - Empty state
- **InviteStaffDialog.tsx** — full name, email, phone, department, position, role select → calls `staff-admin/invite_staff`
- **AssignRoleDialog.tsx** — searchable combobox (debounced, hits `staff-admin/search_users`), shows results with avatar/name/email/current role, role select, permissions preview panel, Cancel/Assign buttons
- **StaffProfileDrawer.tsx** — click a card to open: profile info, working schedule, activity log (from `activity_logs`), assigned patients count, appointments count
- **useStaffAdmin.ts** — hook wrapping `supabase.functions.invoke('staff-admin', ...)` with toast handling
- **rolePermissions.ts** — static map of role → permissions[] used by AssignRoleDialog preview

### 4. Security & UX

- `ProtectedRoute allowedRoles={["super_admin","manager"]}` on the new page.
- Confirm dialogs for Suspend / Delete / Reset Password.
- Sonner toasts for success/error.
- Loading skeletons and spinner states on all async ops.
- Never displays raw UUIDs.

### 5. Out of scope (call out to user)

- Custom-role builder UI (adding brand-new role strings at runtime) — the enum is DB-typed; adding roles requires a migration. Plan ships with the expanded fixed list above; a future "Add custom role" would need dynamic role table instead of enum. If you want that instead, say the word and I'll swap to a `roles` table.
- Real notifications to staff on role change beyond the invite/reset password emails Supabase sends automatically.

---

Reply **go** to build it, or tell me what to change (e.g. "use a dynamic roles table instead of enum", "keep old Staff page", "skip activity drawer for v1").