import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Archive as ArchiveIcon,
  Search,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Download,
  Lock,
  Unlock,
  DatabaseBackup,
  FileJson,
  FileSpreadsheet,
  Eye,
  ShieldCheck,
  CalendarClock,
  HardDriveDownload,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ARCHIVE_SOURCES,
  computeRetentionUntil,
  downloadFile,
  logArchiveActivity,
  sha256,
  sourceConfig,
  toCsv,
  type ArchiveSource,
} from "@/lib/archive";

interface ArchivedRecord {
  id: string;
  source_table: string;
  source_id: string;
  label: string;
  summary: string | null;
  snapshot: any;
  checksum: string | null;
  reason: string | null;
  archived_at: string;
  retention_until: string | null;
  legal_hold: boolean;
  legal_hold_reason: string | null;
  status: string;
  restored_at: string | null;
  purged_at: string | null;
}

interface RetentionPolicy {
  id: string;
  record_type: string;
  label: string;
  retention_years: number;
  minor_until_age: number | null;
  legal_basis: string | null;
  description: string | null;
}

interface BackupRun {
  id: string;
  kind: string;
  scope: string;
  status: string;
  record_count: number;
  size_bytes: number;
  checksum: string | null;
  notes: string | null;
  created_at: string;
}

const BACKUP_TABLES = [
  "patients",
  "appointments",
  "treatment_records",
  "intake_forms",
  "messages",
  "services",
  "staff",
  "archived_records",
] as const;

const statusTint: Record<string, string> = {
  archived: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  restored: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  purged: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

export default function Archive() {
  const { toast } = useToast();
  const { roles, user } = useAuth();
  const isSuperAdmin = roles.includes("super_admin" as any);
  const canArchive = isSuperAdmin || roles.includes("manager" as any);

  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [backups, setBackups] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("archived");

  const [viewing, setViewing] = useState<ArchivedRecord | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<ArchivedRecord | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, p, b] = await Promise.all([
      supabase.from("archived_records").select("*").order("archived_at", { ascending: false }),
      supabase.from("retention_policies").select("*").order("label"),
      supabase.from("backup_runs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (a.error) {
      toast({ title: "Failed to load archive", description: a.error.message, variant: "destructive" });
    }
    setRecords((a.data as any) || []);
    setPolicies((p.data as any) || []);
    setBackups((b.data as any) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (sourceFilter !== "all" && r.source_table !== sourceFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.label.toLowerCase().includes(q) ||
          (r.summary || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q)
        );
      }),
    [records, sourceFilter, statusFilter, search]
  );

  const stats = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return {
      total: records.length,
      active: records.filter((r) => r.status === "archived").length,
      holds: records.filter((r) => r.legal_hold && r.status !== "purged").length,
      dueForReview: records.filter(
        (r) => r.status === "archived" && r.retention_until && r.retention_until <= now
      ).length,
    };
  }, [records]);

  /* ------------------------------ actions ------------------------------ */

  async function restore(rec: ArchivedRecord) {
    setBusy(rec.id);
    const { error: srcErr } = await supabase
      .from(rec.source_table as any)
      .update({ archived_at: null, archived_by: null })
      .eq("id", rec.source_id);
    if (srcErr) {
      setBusy(null);
      toast({ title: "Restore failed", description: srcErr.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("archived_records")
      .update({ status: "restored", restored_at: new Date().toISOString(), restored_by: user?.id })
      .eq("id", rec.id);
    setBusy(null);
    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return;
    }
    await logArchiveActivity("archive.restore", rec.source_table, rec.source_id, { label: rec.label });
    toast({ title: "Restored", description: `${rec.label} is back in active use.` });
    void load();
  }

  async function toggleHold(rec: ArchivedRecord) {
    setBusy(rec.id);
    const next = !rec.legal_hold;
    const { error } = await supabase
      .from("archived_records")
      .update({
        legal_hold: next,
        legal_hold_reason: next ? "Placed on hold by administrator" : null,
      })
      .eq("id", rec.id);
    setBusy(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await logArchiveActivity("archive.legal_hold", rec.source_table, rec.source_id, { hold: next });
    toast({ title: next ? "Legal hold placed" : "Legal hold lifted" });
    void load();
  }

  async function purge(rec: ArchivedRecord) {
    setBusy(rec.id);
    // The database trigger re-checks role, legal hold and retention expiry.
    const { error } = await supabase
      .from("archived_records")
      .update({ status: "purged" })
      .eq("id", rec.id);
    if (error) {
      setBusy(null);
      toast({ title: "Purge blocked", description: error.message, variant: "destructive" });
      return;
    }
    const { error: delErr } = await supabase
      .from(rec.source_table as any)
      .delete()
      .eq("id", rec.source_id);
    setBusy(null);
    await logArchiveActivity("archive.purge", rec.source_table, rec.source_id, {
      label: rec.label,
      source_row_deleted: !delErr,
    });
    toast({
      title: "Record purged",
      description: delErr
        ? "Archive snapshot redacted. The source row could not be deleted: " + delErr.message
        : "Snapshot redacted and source record permanently deleted.",
      variant: delErr ? "destructive" : undefined,
    });
    setPurgeTarget(null);
    void load();
  }

  async function savePolicy(p: RetentionPolicy, years: number, minorAge: number | null) {
    const { error } = await supabase
      .from("retention_policies")
      .update({ retention_years: years, minor_until_age: minorAge })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await logArchiveActivity("retention.update", "retention_policies", p.id, {
      record_type: p.record_type,
      retention_years: years,
    });
    toast({ title: "Retention policy updated" });
    void load();
  }

  function exportArchiveIndex(kind: "csv" | "json") {
    const rows = filtered.map((r) => ({
      id: r.id,
      record_type: r.source_table,
      label: r.label,
      summary: r.summary,
      status: r.status,
      reason: r.reason,
      archived_at: r.archived_at,
      retention_until: r.retention_until,
      legal_hold: r.legal_hold,
      checksum: r.checksum,
    }));
    const stamp = format(new Date(), "yyyy-MM-dd-HHmm");
    if (kind === "csv") {
      downloadFile(`archive-index-${stamp}.csv`, toCsv(rows), "text/csv");
    } else {
      downloadFile(`archive-index-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json");
    }
    void logArchiveActivity("archive.export_index", "archived_records", null, {
      format: kind,
      count: rows.length,
    });
  }

  async function runBackup(scope: "clinical" | "archive") {
    setBusy("backup");
    try {
      const tables =
        scope === "archive" ? (["archived_records"] as const) : BACKUP_TABLES.filter((t) => t !== "archived_records");
      const payload: Record<string, any[]> = {};
      let count = 0;
      for (const t of tables) {
        const { data, error } = await supabase.from(t as any).select("*").limit(5000);
        if (error) throw new Error(`${t}: ${error.message}`);
        payload[t] = (data as any) || [];
        count += payload[t].length;
      }
      const body = JSON.stringify(
        {
          clinic: "Muhazi Dental Clinic",
          generated_at: new Date().toISOString(),
          scope,
          tables: payload,
        },
        null,
        2
      );
      const checksum = await sha256(body);
      const stamp = format(new Date(), "yyyy-MM-dd-HHmm");
      downloadFile(`muhazi-${scope}-backup-${stamp}.json`, body, "application/json");

      await supabase.from("backup_runs").insert({
        kind: "manual_export",
        scope,
        status: "completed",
        record_count: count,
        size_bytes: new Blob([body]).size,
        checksum,
        notes: `Tables: ${tables.join(", ")}`,
        created_by: user?.id,
      });
      await logArchiveActivity("backup.export", "backup_runs", null, { scope, count, checksum });
      toast({
        title: "Backup exported",
        description: `${count} records · SHA-256 ${checksum.slice(0, 12)}…`,
      });
      void load();
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  /* ------------------------------- render ------------------------------ */

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Records governance
            </p>
            <h1 className="text-3xl font-heading font-bold mt-1 flex items-center gap-2">
              <ArchiveIcon className="w-7 h-7 text-primary" /> Clinical archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Retention-controlled archive for patient files, treatment records, consent forms and
              correspondence — aligned with FDI/GDC dental record-keeping and GDPR storage limitation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canArchive && (
              <Button onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon className="w-4 h-4 mr-2" /> Archive records
              </Button>
            )}
            <Button variant="outline" onClick={() => exportArchiveIndex("csv")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={() => exportArchiveIndex("json")}>
              <FileJson className="w-4 h-4 mr-2" /> JSON
            </Button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Archived items", value: stats.total, icon: ArchiveIcon },
            { label: "In archive", value: stats.active, icon: DatabaseBackup },
            { label: "Legal holds", value: stats.holds, icon: Lock },
            { label: "Retention expired", value: stats.dueForReview, icon: CalendarClock },
          ].map((s) => (
            <Card key={s.label} className="border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-heading font-bold tabular-nums leading-none">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 truncate">
                    {s.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="archive">
          <TabsList>
            <TabsTrigger value="archive">Archive</TabsTrigger>
            <TabsTrigger value="retention">Retention policies</TabsTrigger>
            <TabsTrigger value="backups">Backup &amp; recovery</TabsTrigger>
          </TabsList>

          {/* ---------------------------- ARCHIVE ---------------------------- */}
          <TabsContent value="archive" className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search archived records…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="md:w-52">
                  <SelectValue placeholder="Record type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All record types</SelectItem>
                  {ARCHIVE_SOURCES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="restored">Restored</SelectItem>
                  <SelectItem value="purged">Purged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-border/70">
              <CardContent className="p-0 divide-y divide-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 m-3 rounded-lg bg-muted animate-pulse" />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <ArchiveIcon className="w-10 h-10 mx-auto text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No archived records match these filters.
                    </p>
                  </div>
                ) : (
                  filtered.map((r) => {
                    const expired =
                      !!r.retention_until && r.retention_until <= new Date().toISOString().slice(0, 10);
                    return (
                      <div
                        key={r.id}
                        className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm truncate">{r.label}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {sourceConfig(r.source_table).label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] capitalize", statusTint[r.status])}
                            >
                              {r.status}
                            </Badge>
                            {r.legal_hold && (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-500/30">
                                <Lock className="w-3 h-3 mr-1" /> Legal hold
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {r.summary || "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                            Archived {format(new Date(r.archived_at), "dd MMM yyyy")}
                            {r.retention_until && (
                              <>
                                {" · "}
                                <span className={cn(expired && "text-rose-600 font-semibold")}>
                                  retention until {r.retention_until}
                                </span>
                              </>
                            )}
                            {r.checksum && ` · sha256 ${r.checksum.slice(0, 10)}…`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          {canArchive && r.status === "archived" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === r.id}
                                onClick={() => restore(r)}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" /> Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy === r.id}
                                onClick={() => toggleHold(r)}
                                title={r.legal_hold ? "Lift legal hold" : "Place legal hold"}
                              >
                                {r.legal_hold ? (
                                  <Unlock className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                          {isSuperAdmin && r.status === "archived" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700"
                              disabled={busy === r.id || r.legal_hold || !expired}
                              title={
                                r.legal_hold
                                  ? "Under legal hold"
                                  : !expired
                                  ? "Retention period has not expired"
                                  : "Permanently purge"
                              }
                              onClick={() => setPurgeTarget(r)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --------------------------- RETENTION --------------------------- */}
          <TabsContent value="retention" className="mt-4 space-y-4">
            <Card className="border-border/70 bg-primary/5">
              <CardContent className="p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Defaults follow international dental record-keeping guidance: adult clinical records
                  kept a minimum of <strong>10 years</strong> after last treatment, records of minors
                  until <strong>age 25</strong>, and correspondence minimised to{" "}
                  <strong>2 years</strong>. Retention expiry is calculated at the moment a record is
                  archived and enforced by the database before any purge.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              {policies.map((p) => (
                <PolicyCard
                  key={p.id}
                  policy={p}
                  canEdit={isSuperAdmin}
                  onSave={(y, m) => savePolicy(p, y, m)}
                />
              ))}
            </div>
          </TabsContent>

          {/* ---------------------------- BACKUPS ---------------------------- */}
          <TabsContent value="backups" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDriveDownload className="w-4 h-4 text-primary" /> Clinical data export
                  </CardTitle>
                  <CardDescription>
                    Full JSON snapshot of patients, appointments, treatment records, intake forms,
                    correspondence, services and staff, with a SHA-256 integrity checksum.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled={!canArchive || busy === "backup"} onClick={() => runBackup("clinical")}>
                    <Download className="w-4 h-4 mr-2" />
                    {busy === "backup" ? "Preparing…" : "Export clinical backup"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArchiveIcon className="w-4 h-4 text-primary" /> Archive vault export
                  </CardTitle>
                  <CardDescription>
                    Exports every archived snapshot with its checksum, retention date and legal-hold
                    state — the off-site copy for your 3-2-1 backup rotation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    disabled={!canArchive || busy === "backup"}
                    onClick={() => runBackup("archive")}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export archive vault
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Backup history</CardTitle>
                <CardDescription>
                  Every export is logged with its checksum so a restored file can be verified against
                  the original.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {backups.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No backups yet.</p>
                ) : (
                  backups.map((b) => (
                    <div key={b.id} className="px-6 py-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">
                          {b.scope} · {b.kind.replace("_", " ")}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {format(new Date(b.created_at), "dd MMM yyyy HH:mm")} · {b.record_count} records ·{" "}
                          {(b.size_bytes / 1024).toFixed(1)} KB
                          {b.checksum && ` · sha256 ${b.checksum.slice(0, 16)}…`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", statusTint.restored)}>
                        {b.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-secondary" /> Backup &amp; recovery strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">3-2-1 rule.</strong> Managed Postgres runs
                  continuous automated backups (point-in-time recovery); take a weekly manual export
                  above and keep one copy off-site on encrypted storage.
                </p>
                <p>
                  <strong className="text-foreground">Integrity.</strong> Each archived snapshot and
                  each export carries a SHA-256 checksum; verify it before restoring.
                </p>
                <p>
                  <strong className="text-foreground">Least privilege.</strong> Row-level security
                  restricts the archive to clinic staff; only super admins and managers may archive or
                  restore, and only super admins may purge — after retention expiry and with no legal
                  hold in force.
                </p>
                <p>
                  <strong className="text-foreground">Auditability.</strong> Archive, restore, hold and
                  purge events are written to the audit log and archive rows cannot be deleted, keeping
                  the chain of custody intact.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Snapshot viewer */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.label}</DialogTitle>
            <DialogDescription>
              {viewing && sourceConfig(viewing.source_table).label} · archived{" "}
              {viewing && format(new Date(viewing.archived_at), "dd MMM yyyy HH:mm")}
            </DialogDescription>
          </DialogHeader>
          {viewing?.reason && (
            <p className="text-sm">
              <span className="text-muted-foreground">Reason: </span>
              {viewing.reason}
            </p>
          )}
          <pre className="max-h-[50vh] overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
            {JSON.stringify(viewing?.snapshot, null, 2)}
          </pre>
          {viewing?.checksum && (
            <p className="text-[11px] font-mono text-muted-foreground break-all">
              SHA-256 {viewing.checksum}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Purge confirmation */}
      <AlertDialog open={!!purgeTarget} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently purge this record?</AlertDialogTitle>
            <AlertDialogDescription>
              The snapshot will be redacted and the original row deleted. This is irreversible and is
              logged against your account. Only do this once the statutory retention period has
              expired.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => purgeTarget && purge(purgeTarget)}
            >
              Purge permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchiveRecordsDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        policies={policies}
        onDone={load}
      />
    </AdminLayout>
  );
}

/* -------------------------------------------------------------------------- */

function PolicyCard({
  policy,
  canEdit,
  onSave,
}: {
  policy: RetentionPolicy;
  canEdit: boolean;
  onSave: (years: number, minorAge: number | null) => void;
}) {
  const [years, setYears] = useState(policy.retention_years);
  const [minorAge, setMinorAge] = useState<string>(
    policy.minor_until_age ? String(policy.minor_until_age) : ""
  );
  const dirty = years !== policy.retention_years || (minorAge ? Number(minorAge) : null) !== policy.minor_until_age;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{policy.label}</CardTitle>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Retention (years)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={years}
              disabled={!canEdit}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Minors until age</Label>
            <Input
              type="number"
              min={18}
              max={30}
              placeholder="n/a"
              value={minorAge}
              disabled={!canEdit}
              onChange={(e) => setMinorAge(e.target.value)}
            />
          </div>
        </div>
        {policy.legal_basis && (
          <p className="text-[11px] text-muted-foreground">Basis: {policy.legal_basis}</p>
        )}
        {canEdit && (
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => onSave(years, minorAge ? Number(minorAge) : null)}
          >
            Save policy
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function ArchiveRecordsDialog({
  open,
  onOpenChange,
  policies,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  policies: RetentionPolicy[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [source, setSource] = useState<ArchiveSource>("patients");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [hold, setHold] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = sourceConfig(source);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      let q = supabase.from(source as any).select(cfg.select).is("archived_at", null).limit(40);
      if (query) q = q.ilike(cfg.searchField, `%${query}%`);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) toast({ title: "Search failed", description: error.message, variant: "destructive" });
      setRows((data as any) || []);
      setLoading(false);
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, source, query, cfg, toast]);

  useEffect(() => {
    setSelected({});
  }, [source, open]);

  async function submit() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;
    if (reason.trim().length < 3) {
      toast({ title: "Reason required", description: "Record why these files are archived.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const policy = policies.find((p) => p.record_type === source);
    const years = policy?.retention_years ?? cfg.defaultYears;
    let ok = 0;

    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      const { data: full, error: fullErr } = await supabase
        .from(source as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (fullErr || !full) continue;

      const snapshot = full as any;
      const checksum = await sha256(JSON.stringify(snapshot));
      const retention = computeRetentionUntil(
        new Date(),
        years,
        snapshot.date_of_birth ?? null,
        policy?.minor_until_age ?? null
      );

      const { error: insErr } = await supabase.from("archived_records").insert({
        source_table: source,
        source_id: id,
        label: cfg.labelOf(row),
        summary: cfg.summaryOf(row),
        snapshot,
        checksum,
        patient_ref: cfg.patientRefOf(row),
        reason: reason.trim(),
        archived_by: user?.id,
        retention_until: retention,
        legal_hold: hold,
        legal_hold_reason: hold ? reason.trim() : null,
      });
      if (insErr) {
        toast({ title: "Archive failed", description: insErr.message, variant: "destructive" });
        continue;
      }
      await supabase
        .from(source as any)
        .update({ archived_at: new Date().toISOString(), archived_by: user?.id })
        .eq("id", id);
      await logArchiveActivity("archive.create", source, id, { label: cfg.labelOf(row), retention });
      ok += 1;
    }

    setSaving(false);
    if (ok > 0) {
      toast({ title: "Archived", description: `${ok} record(s) moved to the clinical archive.` });
      setReason("");
      setHold(false);
      onOpenChange(false);
      onDone();
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Archive records</DialogTitle>
          <DialogDescription>
            Archived records leave the day-to-day lists but stay retrievable, checksum-verified and
            retention-controlled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={source} onValueChange={(v) => setSource(v as ArchiveSource)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_SOURCES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border">
            {loading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing to archive here.</p>
            ) : (
              rows.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="accent-[hsl(var(--primary))] w-4 h-4"
                    checked={!!selected[r.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cfg.labelOf(r)}</p>
                    <p className="text-xs text-muted-foreground truncate">{cfg.summaryOf(r)}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div>
            <Label className="text-xs">Reason for archiving *</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient inactive since 2019 — file closed after final review."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Place under legal hold</p>
              <p className="text-xs text-muted-foreground">
                Blocks purging regardless of retention expiry (claims, disputes, investigations).
              </p>
            </div>
            <Switch checked={hold} onCheckedChange={setHold} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selectedCount === 0 || saving} onClick={submit}>
            {saving ? "Archiving…" : `Archive ${selectedCount || ""} record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
