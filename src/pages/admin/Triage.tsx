import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Phone,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type TriageStatus = "scheduled" | "arrived" | "in_treatment" | "completed";

interface Appt {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  patient: { full_name: string; phone: string } | null;
  service: { name: string } | null;
  staff: { full_name: string } | null;
}

const COLUMNS: { key: TriageStatus; label: string; icon: any; tint: string }[] = [
  { key: "scheduled", label: "Scheduled", icon: Clock, tint: "bg-sky-500/10 text-sky-700 border-sky-500/30" },
  { key: "arrived", label: "Arrived", icon: UserCheck, tint: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { key: "in_treatment", label: "In treatment", icon: Stethoscope, tint: "bg-violet-500/10 text-violet-700 border-violet-500/30" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tint: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
];

// Map DB statuses to the four triage buckets.
function bucketOf(s: string): TriageStatus {
  if (s === "arrived") return "arrived";
  if (s === "in_treatment" || s === "in-treatment") return "in_treatment";
  if (s === "completed") return "completed";
  return "scheduled"; // pending, confirmed, scheduled
}

const NEXT: Record<TriageStatus, TriageStatus | null> = {
  scheduled: "arrived",
  arrived: "in_treatment",
  in_treatment: "completed",
  completed: null,
};

export default function Triage() {
  const { toast } = useToast();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void fetchToday();
    const ch = supabase
      .channel("triage-appts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchToday()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function fetchToday() {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, status, notes, patient:patients(full_name, phone), service:services(name), staff:staff(full_name)"
      )
      .eq("appointment_date", today)
      .order("appointment_time");
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setAppts((data as unknown as Appt[]) || []);
    }
    setLoading(false);
  }

  async function setStatus(id: string, next: TriageStatus | "cancelled") {
    setUpdating(id);
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);
    setUpdating(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
  }

  const grouped = useMemo(() => {
    const g: Record<TriageStatus, Appt[]> = { scheduled: [], arrived: [], in_treatment: [], completed: [] };
    appts.forEach((a) => g[bucketOf(a.status)].push(a));
    return g;
  }, [appts]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              {format(new Date(), "EEEE · dd MMMM yyyy")}
            </p>
            <h1 className="text-3xl font-heading font-bold mt-1">Triage board</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Move patients across the day. Live-synced with the schedule.
            </p>
          </div>
          <Button variant="outline" onClick={fetchToday}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = grouped[col.key];
            return (
              <div key={col.key} className="flex flex-col">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-t-xl border", col.tint)}>
                  <div className="flex items-center gap-2">
                    <col.icon className="w-4 h-4" />
                    <span className="font-heading font-semibold text-sm">{col.label}</span>
                  </div>
                  <Badge variant="outline" className="bg-background/80 text-foreground">
                    {items.length}
                  </Badge>
                </div>
                <div className="flex-1 bg-muted/30 border border-t-0 border-border rounded-b-xl p-2 space-y-2 min-h-[260px]">
                  {loading && items.length === 0 ? (
                    <div className="h-20 rounded-lg bg-muted animate-pulse" />
                  ) : items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No patients</p>
                  ) : (
                    items.map((a) => {
                      const next = NEXT[col.key];
                      return (
                        <Card key={a.id} className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {a.patient?.full_name || "Unknown"}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {a.service?.name || "Consultation"}
                                </p>
                              </div>
                              <span className="font-mono text-xs font-semibold tabular-nums shrink-0">
                                {a.appointment_time?.slice(0, 5)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {a.staff?.full_name && (
                                <span className="truncate">Dr. {a.staff.full_name}</span>
                              )}
                              {a.patient?.phone && (
                                <a
                                  href={`tel:${a.patient.phone}`}
                                  className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Phone className="w-3 h-3" /> Call
                                </a>
                              )}
                            </div>
                            <div className="flex gap-1 pt-1">
                              {next && (
                                <Button
                                  size="sm"
                                  className="flex-1 h-7 text-xs"
                                  disabled={updating === a.id}
                                  onClick={() => setStatus(a.id, next)}
                                >
                                  {next === "arrived" && "Check in"}
                                  {next === "in_treatment" && "Start"}
                                  {next === "completed" && "Complete"}
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                              {col.key !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-rose-600 hover:text-rose-700"
                                  disabled={updating === a.id}
                                  onClick={() => setStatus(a.id, "cancelled")}
                                  title="Cancel"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
