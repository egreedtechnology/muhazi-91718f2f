import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Users,
  Clock,
  UserPlus,
  CalendarPlus,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Stethoscope,
  Megaphone,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Appt {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient: { full_name: string; phone: string } | null;
  service: { name: string } | null;
  staff: { full_name: string } | null;
}
interface PatientRow { id: string; full_name: string; phone: string; created_at: string }
interface MsgRow { id: string; full_name: string; subject: string; created_at: string; is_read: boolean }

const statusStyle: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  completed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [todays, setTodays] = useState<Appt[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const [recentMsgs, setRecentMsgs] = useState<MsgRow[]>([]);
  const [weekSeries, setWeekSeries] = useState<{ d: string; n: number }[]>([]);
  const [counts, setCounts] = useState({ patients: 0, pending: 0, unread: 0, weekTotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { void fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const sevenAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

    const [apptToday, apptWeek, patients, pendingCnt, msgs, unreadCnt] = await Promise.all([
      supabase.from("appointments").select("id, appointment_date, appointment_time, status, patient:patients(full_name, phone), service:services(name), staff:staff(full_name)").eq("appointment_date", today).order("appointment_time"),
      supabase.from("appointments").select("appointment_date").gte("appointment_date", sevenAgo),
      supabase.from("patients").select("id, full_name, phone, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("messages").select("id, full_name, subject, created_at, is_read").order("created_at", { ascending: false }).limit(4),
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("is_read", false),
    ]);

    const patientCount = (await supabase.from("patients").select("*", { count: "exact", head: true })).count || 0;

    setTodays((apptToday.data as unknown as Appt[]) || []);
    setRecentPatients((patients.data as PatientRow[]) || []);
    setRecentMsgs((msgs.data as MsgRow[]) || []);

    // Build last-7-day series
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      map[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
    }
    (apptWeek.data || []).forEach((r: any) => {
      if (map[r.appointment_date] !== undefined) map[r.appointment_date] += 1;
    });
    const series = Object.entries(map).map(([d, n]) => ({ d, n }));
    setWeekSeries(series);
    const weekTotal = series.reduce((s, x) => s + x.n, 0);

    setCounts({
      patients: patientCount,
      pending: pendingCnt.count || 0,
      unread: unreadCnt.count || 0,
      weekTotal,
    });
    setLoading(false);
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("appointments").update({ status }).eq("id", id);
    fetchAll();
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const maxBar = Math.max(1, ...weekSeries.map((s) => s.n));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              {format(new Date(), "EEEE · dd MMMM yyyy")}
            </p>
            <h1 className="text-3xl md:text-4xl font-heading font-bold mt-1">
              {greeting}, <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">{user?.email?.split("@")[0] || "Doctor"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here is what is happening across your clinic today.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/patients"><UserPlus className="w-4 h-4 mr-2" />New patient</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-95">
              <Link to="/admin/appointments"><CalendarPlus className="w-4 h-4 mr-2" />New appointment</Link>
            </Button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiTile icon={Calendar} label="Today" value={todays.length} hint="appointments" tint="primary" />
          <KpiTile icon={Clock} label="Pending" value={counts.pending} hint="awaiting confirmation" tint="amber" />
          <KpiTile icon={Users} label="Patients" value={counts.patients} hint="total records" tint="secondary" />
          <KpiTile icon={MessageSquare} label="Inbox" value={counts.unread} hint="unread" tint="sky" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* Today's schedule — wide */}
          <Card className="lg:col-span-2 border-border/60 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading font-semibold text-base">Today's schedule</h2>
                    <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, dd MMM")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-primary">
                  <Link to="/admin/appointments">Open <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[0,1,2].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : todays.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No appointments today</p>
                  <Button variant="link" size="sm" asChild className="mt-1">
                    <Link to="/admin/appointments">Schedule one</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {todays.map((a) => (
                    <div key={a.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                      <div className="w-14 text-center">
                        <p className="font-mono text-base font-semibold text-foreground leading-none">{a.appointment_time?.slice(0,5)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{a.appointment_time?.slice(0,2) >= "12" ? "PM" : "AM"}</p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.patient?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.service?.name ?? "Consultation"} · Dr. {a.staff?.full_name ?? "Unassigned"}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("capitalize text-[10px]", statusStyle[a.status] || "")}>
                        {a.status}
                      </Badge>
                      {a.status === "pending" && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => setStatus(a.id, "confirmed")}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setStatus(a.id, "cancelled")}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week chart */}
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-heading font-semibold text-base">This week</h2>
                    <p className="text-xs text-muted-foreground">{counts.weekTotal} appointments</p>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {weekSeries.map((s, i) => (
                  <div key={s.d} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={cn(
                          "w-full rounded-md transition-all",
                          i === weekSeries.length - 1
                            ? "bg-gradient-to-t from-primary to-primary-glow"
                            : "bg-primary/20 hover:bg-primary/30"
                        )}
                        style={{ height: `${(s.n / maxBar) * 100}%`, minHeight: s.n > 0 ? "6px" : "2px" }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {format(new Date(s.d), "EEEEEE")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* Recent patients */}
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Recent patients
                </h2>
                <Button variant="ghost" size="sm" asChild className="text-primary">
                  <Link to="/admin/patients">All <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              </div>
              {recentPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No patients yet</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentPatients.map((p) => (
                    <li key={p.id} className="py-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-light to-muted flex items-center justify-center text-primary font-semibold text-xs">
                        {p.full_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.phone}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(p.created_at), "dd MMM")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Inbox preview */}
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-secondary" /> Inbox
                </h2>
                <Button variant="ghost" size="sm" asChild className="text-primary">
                  <Link to="/admin/messages">Open <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              </div>
              {recentMsgs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No messages</p>
              ) : (
                <ul className="space-y-2">
                  {recentMsgs.map((m) => (
                    <li key={m.id} className="p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        {!m.is_read && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                        <p className="text-sm font-medium truncate flex-1">{m.full_name}</p>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "dd MMM")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.subject}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-5">
              <h2 className="font-heading font-semibold text-base flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-accent" /> Quick actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction to="/admin/appointments" icon={CalendarPlus} label="Book" />
                <QuickAction to="/admin/patients" icon={UserPlus} label="Patient" />
                <QuickAction to="/admin/services" icon={Stethoscope} label="Services" />
                <QuickAction to="/admin/gallery" icon={ImageIcon} label="Gallery" />
                <QuickAction to="/admin/blog" icon={Activity} label="Blog" />
                <QuickAction to="/admin/announcements" icon={Megaphone} label="Notice" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function KpiTile({ icon: Icon, label, value, hint, tint }: { icon: any; label: string; value: number; hint: string; tint: "primary" | "secondary" | "amber" | "sky" }) {
  const tints: Record<string, string> = {
    primary: "from-primary/10 to-primary-glow/5 text-primary",
    secondary: "from-secondary/15 to-secondary/5 text-secondary",
    amber: "from-amber-400/15 to-amber-300/5 text-amber-600",
    sky: "from-sky-400/15 to-sky-300/5 text-sky-600",
  };
  return (
    <Card className="border-border/60 shadow-card overflow-hidden relative group hover:shadow-medium transition-shadow">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", tints[tint])} />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", tints[tint].split(" ").pop())} />
        </div>
        <p className="text-3xl font-heading font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-colors">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
