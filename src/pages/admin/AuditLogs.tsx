import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, ShieldCheck, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface LogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
}

export default function AuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");
  const [range, setRange] = useState<string>("7d");

  useEffect(() => {
    void fetchLogs();
  }, [range]);

  async function fetchLogs() {
    setLoading(true);
    const since = new Date();
    if (range === "24h") since.setHours(since.getHours() - 24);
    else if (range === "7d") since.setDate(since.getDate() - 7);
    else if (range === "30d") since.setDate(since.getDate() - 30);
    else since.setFullYear(since.getFullYear() - 5);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast({ title: "Failed to load logs", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data as LogRow[]) || [];
    setLogs(rows);

    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    if (userIds.length) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (pData as ProfileLite[] | null)?.forEach((p) => {
        map[p.id] = p.full_name || p.id.slice(0, 8);
      });
      setProfiles(map);
    }
    setLoading(false);
  }

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean))).sort() as string[],
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (entity !== "all" && l.entity_type !== entity) return false;
      if (!q) return true;
      const blob = `${l.action} ${l.entity_type ?? ""} ${l.entity_id ?? ""} ${
        profiles[l.user_id ?? ""] ?? ""
      } ${JSON.stringify(l.details ?? {})}`.toLowerCase();
      return blob.includes(q);
    });
  }, [logs, action, entity, search, profiles]);

  function exportCSV() {
    const headers = ["timestamp", "user", "action", "entity_type", "entity_id", "details"];
    const rows = filtered.map((l) => [
      l.created_at,
      profiles[l.user_id ?? ""] ?? l.user_id ?? "system",
      l.action,
      l.entity_type ?? "",
      l.entity_id ?? "",
      JSON.stringify(l.details ?? {}),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filtered.length} rows downloaded.` });
  }

  const sensitive = (a: string) =>
    /delete|remove|revoke|fail|denied|login|logout|role|permission/i.test(a);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Security
            </p>
            <h1 className="text-3xl font-heading font-bold mt-1 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary" />
              Audit log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track every sensitive action across the clinic workspace.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <Card className="border-border/60 shadow-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search action, user, entity, details…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(["24h", "7d", "30d", "all"] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? "default" : "outline"}
                  onClick={() => setRange(r)}
                >
                  {r === "24h" ? "Last 24h" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "All time"}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto self-center">
                Showing {filtered.length} of {logs.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Loading audit trail…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No events match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(l.created_at), "dd MMM HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.user_id ? profiles[l.user_id] ?? l.user_id.slice(0, 8) : (
                          <span className="text-muted-foreground italic">system</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sensitive(l.action)
                              ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          }
                        >
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.entity_type ? (
                          <span className="font-mono">
                            {l.entity_type}
                            {l.entity_id ? `:${l.entity_id.slice(0, 8)}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[420px]">
                        <code className="text-[11px] text-muted-foreground line-clamp-2 block">
                          {l.details ? JSON.stringify(l.details) : "—"}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
