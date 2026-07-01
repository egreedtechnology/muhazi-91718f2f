import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  UserPlus,
  MoreVertical,
  Shield,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AppRole,
  ROLE_LABELS,
  STATUS_META,
} from "@/lib/rolePermissions";
import { InviteStaffDialog } from "@/components/admin/InviteStaffDialog";
import { AssignRoleDialog } from "@/components/admin/AssignRoleDialog";

interface StaffRow {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  specialization: string | null;
  status: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  roles: AppRole[];
}

const FILTERS = [
  { id: "all", label: "All Staff" },
  { id: "dentist", label: "Dentists" },
  { id: "manager", label: "Managers" },
  { id: "receptionist", label: "Receptionists" },
  { id: "it_admin", label: "IT" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
] as const;

const PAGE_SIZE = 12;

export default function StaffAccounts() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSeed, setAssignSeed] = useState<{
    user_id: string;
    full_name: string;
    email: string | null;
  } | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    action: () => Promise<void>;
  }>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: staff }, { data: roles }] = await Promise.all([
      supabase.from("staff").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    setRows(
      (staff ?? []).map((s: any) => ({
        ...s,
        roles: s.user_id ? roleMap.get(s.user_id) ?? [] : [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && r.status !== "active") return false;
      if (filter === "pending" && r.status !== "pending") return false;
      if (filter === "suspended" && r.status !== "suspended") return false;
      if (
        ["dentist", "manager", "receptionist", "it_admin"].includes(filter) &&
        !r.roles.includes(filter as AppRole)
      )
        return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.department ?? "").toLowerCase().includes(q) ||
        r.roles.some((rl) => ROLE_LABELS[rl].toLowerCase().includes(q))
      );
    });
  }, [rows, search, filter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const initials = (n: string) =>
    n
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const invoke = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("staff-admin", {
      body: { action, payload },
    });
    if (error || data?.error) {
      toast.error(error?.message ?? data?.error ?? "Action failed");
      return false;
    }
    return true;
  };

  const setStatus = async (row: StaffRow, status: string) => {
    if (await invoke("set_status", { staff_id: row.id, status })) {
      toast.success(`Status updated to ${status}`);
      load();
    }
  };

  const resetPassword = async (row: StaffRow) => {
    if (!row.email) {
      toast.error("This staff member has no email");
      return;
    }
    if (await invoke("reset_password", { email: row.email })) {
      toast.success("Password reset email sent");
    }
  };

  const deleteStaff = async (row: StaffRow) => {
    if (
      await invoke("delete_staff", {
        staff_id: row.id,
        user_id: row.user_id,
        delete_auth: false,
      })
    ) {
      toast.success("Staff removed");
      load();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Staff Accounts</h1>
            <p className="text-muted-foreground text-sm">
              Manage clinic staff, roles, and account status
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssignSeed(null);
                setAssignOpen(true);
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Staff
            </Button>
          </div>
        </div>

        {/* Filters + search */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, role, or department…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.id}
                  variant={filter === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilter(f.id);
                    setPage(1);
                  }}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : paged.length === 0 ? (
          <Card>
            <CardContent className="p-16 flex flex-col items-center text-center gap-3">
              <Users className="w-10 h-10 text-muted-foreground" />
              <p className="font-medium">No staff match your filters</p>
              <p className="text-sm text-muted-foreground">
                Try changing filters or invite a new staff member.
              </p>
              <Button onClick={() => setInviteOpen(true)} className="mt-2">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Staff
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((row) => {
              const meta = STATUS_META[row.status] ?? STATUS_META.active;
              const primaryRole = row.roles[0];
              return (
                <Card key={row.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        {row.avatar_url && (
                          <AvatarImage src={row.avatar_url} alt={row.full_name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials(row.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {row.full_name}
                          </p>
                          <span
                            className={`w-2 h-2 rounded-full ${meta.dot}`}
                            title={meta.label}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.email || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.phone || "—"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (!row.user_id) {
                                toast.error(
                                  "This profile has no linked auth account yet.",
                                );
                                return;
                              }
                              setAssignSeed({
                                user_id: row.user_id,
                                full_name: row.full_name,
                                email: row.email,
                              });
                              setAssignOpen(true);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Assign role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(row)}>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Reset password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {row.status !== "active" ? (
                            <DropdownMenuItem
                              onClick={() => setStatus(row, "active")}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({
                                  title: `Suspend ${row.full_name}?`,
                                  description:
                                    "They will lose access until reactivated.",
                                  action: async () => setStatus(row, "suspended"),
                                })
                              }
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setConfirm({
                                title: `Delete ${row.full_name}?`,
                                description:
                                  "This removes the staff profile and role assignments. This cannot be undone.",
                                action: async () => deleteStaff(row),
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={meta.badge}>
                        {meta.label}
                      </Badge>
                      {primaryRole && (
                        <Badge variant="secondary">
                          {ROLE_LABELS[primaryRole]}
                        </Badge>
                      )}
                      {row.department && (
                        <Badge variant="outline">{row.department}</Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex justify-between pt-2 border-t">
                      <span>
                        Last login:{" "}
                        {row.last_login_at
                          ? new Date(row.last_login_at).toLocaleDateString()
                          : "—"}
                      </span>
                      <span>
                        Joined {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={load}
      />
      <AssignRoleDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        seed={assignSeed}
        onAssigned={load}
      />

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirm?.action();
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
