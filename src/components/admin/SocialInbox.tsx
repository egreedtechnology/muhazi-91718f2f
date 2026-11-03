import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Facebook, Instagram, MessageSquare, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Conv = { id: string; platform: string; kind: string; participant_name: string; status: string; last_event_at: string; last_inbound_at: string | null; read_at: string | null };
type Msg = { id: string; direction: string; body: string; sender_name: string | null; occurred_at: string; is_deleted: boolean; attachments: { url?: string }[] };

const db = supabase as any;
const PIcon = ({ p }: { p: string }) => (p === "instagram" ? <Instagram className="w-4 h-4" /> : <Facebook className="w-4 h-4" />);

async function call(body: object) {
  const { data, error } = await supabase.functions.invoke("social-inbox", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
}

export default function SocialInbox() {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [filter, setFilter] = useState<"all" | "message" | "comment">("all");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const activeRef = useRef<string | undefined>();
  activeRef.current = active?.id;

  const loadConvs = async () => {
    const { data } = await db.from("social_conversations").select("*").order("last_event_at", { ascending: false }).limit(200);
    setConvs(data ?? []);
  };
  const loadMsgs = async (id: string) => {
    const { data } = await db.from("social_messages").select("*").eq("conversation_id", id).order("occurred_at");
    setMsgs(data ?? []);
  };

  useEffect(() => {
    loadConvs();
    const ch = supabase.channel(`social-inbox-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_conversations" }, () => loadConvs())
      .on("postgres_changes", { event: "*", schema: "public", table: "social_messages" }, (p: any) => {
        if (p.new?.conversation_id && p.new.conversation_id === activeRef.current) loadMsgs(activeRef.current);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const open = async (c: Conv) => {
    setActive(c); setText(""); loadMsgs(c.id);
    if (!c.read_at || (c.last_inbound_at && c.read_at < c.last_inbound_at)) call({ action: "read", conversation_id: c.id }).then(loadConvs).catch(() => {});
  };

  const send = async () => {
    if (!active) return;
    setSending(true);
    try {
      await call({ action: "reply", conversation_id: active.id, text });
      setText(""); loadMsgs(active.id); loadConvs();
    } catch (e) { toast({ title: "Reply not sent", description: (e as Error).message, variant: "destructive" }); }
    setSending(false);
  };

  const setStatus = async (status: string) => {
    if (!active) return;
    try { await call({ action: "status", conversation_id: active.id, status }); setActive({ ...active, status }); loadConvs(); }
    catch (e) { toast({ title: "Not updated", description: (e as Error).message, variant: "destructive" }); }
  };

  const unread = (c: Conv) => !!c.last_inbound_at && (!c.read_at || c.read_at < c.last_inbound_at);
  const list = convs.filter((c) => filter === "all" || c.kind === filter);
  const windowOpen = active && (active.kind === "comment" || (active.last_inbound_at && Date.now() - Date.parse(active.last_inbound_at) < 864e5));

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <Card><CardContent className="p-3 space-y-2">
        <div className="flex gap-1">
          {(["all", "message", "comment"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} onClick={() => setFilter(f)} className="capitalize">{f === "all" ? "All" : f + "s"}</Button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No messages or comments yet. They appear here as soon as Meta delivers them.</p>
        ) : (
          <ul className="divide-y max-h-[60vh] overflow-auto">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => open(c)} className={`w-full text-left p-2 rounded-md hover:bg-muted ${active?.id === c.id ? "bg-muted" : ""}`}>
                  <div className="flex items-center gap-2">
                    <PIcon p={c.platform} />
                    <span className={`flex-1 truncate ${unread(c) ? "font-semibold" : ""}`}>{c.participant_name}</span>
                    {unread(c) && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {c.kind === "comment" ? <MessageSquare className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                    {c.kind} · {format(new Date(c.last_event_at), "PP p")}
                    {c.status === "closed" && <Badge variant="outline" className="ml-auto">Closed</Badge>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-4">
        {!active ? <p className="text-sm text-muted-foreground py-16 text-center">Select a conversation.</p> : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PIcon p={active.platform} /><p className="font-medium flex-1">{active.participant_name}</p>
              <Button size="sm" variant="outline" onClick={() => setStatus(active.status === "closed" ? "open" : "closed")}>
                {active.status === "closed" ? "Reopen" : "Mark done"}
              </Button>
            </div>
            <div className="space-y-2 max-h-[45vh] overflow-auto border rounded-md p-3">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : ""}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.is_deleted ? <em className="opacity-70">Removed</em> : m.body || <em className="opacity-70">Attachment</em>}
                    {m.attachments?.map((a, i) => a.url && <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block underline text-xs">View attachment</a>)}
                    <div className="text-[10px] opacity-70 mt-1">{format(new Date(m.occurred_at), "PP p")}</div>
                  </div>
                </div>
              ))}
            </div>
            {windowOpen ? (
              <div className="flex gap-2">
                <Textarea rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={active.kind === "comment" ? "Reply publicly to this comment…" : "Write a reply…"} />
                <Button onClick={send} disabled={sending || !text.trim()}>{sending ? "Sending…" : "Send"}</Button>
              </div>
            ) : <p className="text-xs text-muted-foreground">Meta only allows replies within 24 hours of the patient's last message. Reply from the Facebook or Instagram app instead.</p>}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
