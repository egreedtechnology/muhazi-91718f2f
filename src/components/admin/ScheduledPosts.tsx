import { useCallback, useEffect, useState } from "react";
import { Facebook, Instagram, Film, Image as ImageIcon, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Row = { id: string; caption: string; media_url: string | null; media_type: string; platforms: string[]; scheduled_at: string; status: string; results: Record<string, { ok: boolean; url?: string; error?: string }> };
const db = supabase as any;

export default function ScheduledPosts() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [when, setWhen] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await db.from("social_scheduled_posts").select("*").order("scheduled_at", { ascending: false }).limit(100);
    if (error) toast({ title: "Could not load schedule", description: error.message, variant: "destructive" });
    setRows(data ?? []);
  }, [toast]);

  useEffect(() => {
    load();
    const ch = supabase.channel(`sched-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_scheduled_posts" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const update = async (id: string, patch: object, msg: string) => {
    const { error } = await db.from("social_scheduled_posts").update(patch).eq("id", id).eq("status", "scheduled");
    if (error) return toast({ title: "Not saved", description: error.message, variant: "destructive" });
    toast({ title: msg }); setEditing(null); load();
  };

  const upcoming = rows.filter(r => r.status === "scheduled").sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
  const past = rows.filter(r => r.status !== "scheduled");

  const card = (r: Row) => (
    <div key={r.id} className="border rounded-lg p-3 flex gap-3">
      {r.media_url && (r.media_type === "video"
        ? <div className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0"><Film className="w-6 h-6 text-muted-foreground" /></div>
        : <img src={r.media_url} alt="" className="w-16 h-16 rounded object-cover shrink-0" />)}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />{new Date(r.scheduled_at).toLocaleString()}
          {r.platforms.includes("facebook") && <Facebook className="w-3.5 h-3.5" />}
          {r.platforms.includes("instagram") && <Instagram className="w-3.5 h-3.5" />}
          {r.media_type === "image" && <ImageIcon className="w-3.5 h-3.5" />}
          <Badge variant={r.status === "failed" ? "destructive" : r.status === "published" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
        </div>
        <p className="text-sm line-clamp-2 whitespace-pre-wrap">{r.caption}</p>
        {Object.entries(r.results ?? {}).map(([p, res]) => res.ok
          ? res.url && <a key={p} href={res.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline capitalize mr-3">View on {p}</a>
          : <p key={p} className="text-xs text-destructive capitalize">{p}: {res.error}</p>)}
        {r.status === "scheduled" && (editing === r.id ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Input type="datetime-local" className="w-56 h-8" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="New date and time" />
            <Button size="sm" disabled={!when || new Date(when).getTime() < Date.now() + 60_000} onClick={() => update(r.id, { scheduled_at: new Date(when).toISOString() }, "Rescheduled")}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Back</Button>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => { setEditing(r.id); setWhen(""); }}>Reschedule</Button>
            <Button size="sm" variant="ghost" onClick={() => update(r.id, { status: "cancelled" }, "Cancelled")}>Cancel post</Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 py-4">
      <section className="space-y-2">
        <h3 className="font-semibold">Upcoming ({upcoming.length})</h3>
        {upcoming.length ? upcoming.map(card) : <p className="text-sm text-muted-foreground">Nothing scheduled. Use Create post → Schedule for later.</p>}
        <p className="text-xs text-muted-foreground">Scheduled posts go out within 5 minutes of the chosen time.</p>
      </section>
      {past.length > 0 && <section className="space-y-2"><h3 className="font-semibold">History</h3>{past.map(card)}</section>}
    </div>
  );
}
