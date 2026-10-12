import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Facebook, Instagram, Linkedin, MessageCircle, Twitter, Music2, Inbox, PenSquare, CalendarDays, Plug, Activity, LayoutGrid } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Conn = {
  id: string;
  platform: string;
  account_name: string | null;
  account_id: string | null;
  page_id: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
};

const META: Record<string, { label: string; icon: any; phase: string }> = {
  facebook: { label: "Facebook Page", icon: Facebook, phase: "Meta" },
  instagram: { label: "Instagram Professional", icon: Instagram, phase: "Meta" },
  whatsapp: { label: "WhatsApp Cloud API", icon: MessageCircle, phase: "Meta" },
  linkedin: { label: "LinkedIn", icon: Linkedin, phase: "Coming later" },
  x: { label: "X (Twitter)", icon: Twitter, phase: "Coming later" },
  tiktok: { label: "TikTok", icon: Music2, phase: "Coming later" },
};
const ORDER = ["facebook", "instagram", "whatsapp", "linkedin", "x", "tiktok"];

const statusVariant = (s: string) => (s === "connected" ? "default" : s === "pending" ? "secondary" : "outline");

const ConnectionCard = ({ c, onSaved }: { c: Conn; onSaved: () => void }) => {
  const { toast } = useToast();
  const m = META[c.platform];
  const Icon = m?.icon ?? Plug;
  const [form, setForm] = useState({ account_name: c.account_name ?? "", account_id: c.account_id ?? "", page_id: c.page_id ?? "", status: c.status });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("social_connections" as any)
      .update({ ...form, updated_by: u.user?.id, last_checked_at: new Date().toISOString() })
      .eq("id", c.id);
    setSaving(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: `${m?.label} saved` });
    onSaved();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-5 h-5 text-primary" /> {m?.label ?? c.platform}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">{m?.phase}</Badge>
          <Badge variant={statusVariant(c.status) as any} className="capitalize">{c.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Account name</Label><Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></div>
          <div><Label>Account ID</Label><Input value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} /></div>
          <div><Label>Page ID</Label><Input value={form.page_id} onChange={(e) => setForm({ ...form, page_id: e.target.value })} /></div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="w-48">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disconnected">Disconnected</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Updated {format(new Date(c.updated_at), "PP p")}</p>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Soon = ({ icon: Icon, title, text }: { icon: any; title: string; text: string }) => (
  <Card><CardContent className="py-12 text-center space-y-2">
    <Icon className="w-8 h-8 mx-auto text-muted-foreground" />
    <p className="font-medium">{title}</p>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">{text}</p>
  </CardContent></Card>
);

const SocialHub = () => {
  const [conns, setConns] = useState<Conn[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("social_connections" as any).select("*");
    const list = ((data as any[]) ?? []) as Conn[];
    setConns(list.sort((a, b) => ORDER.indexOf(a.platform) - ORDER.indexOf(b.platform)));
    const { data: l } = await supabase.from("activity_logs").select("*").or("action.ilike.%instagram%,action.ilike.%social%").order("created_at", { ascending: false }).limit(50);
    setLogs(l ?? []);
  };
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const metaResult = params.get("meta");

  useEffect(() => {
    load();
    if (metaResult) {
      const msg = params.get("msg") ?? "";
      toast(metaResult === "connected"
        ? { title: "Meta accounts connected", description: msg.replace(/,/g, ", ") }
        : { title: "Meta connection failed", description: msg, variant: "destructive" });
      window.history.replaceState({}, "", "/admin/social-hub");
    }
  }, []);

  const connectMeta = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("meta-connect", { body: { action: "start", origin: window.location.origin } });
    if (error || !data?.url) {
      setConnecting(false);
      let msg = error?.message ?? "Could not start Meta sign-in";
      try { msg = (await (error as any)?.context?.json())?.error ?? msg; } catch { /* ignore */ }
      return toast({ title: "Could not connect", description: msg, variant: "destructive" });
    }
    window.location.href = data.url;
  };

  const connected = conns.filter((c) => c.status === "connected").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Social Hub</h1>
          <p className="text-muted-foreground">Manage the clinic's social accounts in one place.</p>
        </div>
        <Tabs defaultValue={metaResult ? "connections" : "overview"}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview"><LayoutGrid className="w-4 h-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="inbox"><Inbox className="w-4 h-4 mr-1" />Inbox</TabsTrigger>
            <TabsTrigger value="create"><PenSquare className="w-4 h-4 mr-1" />Create post</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="w-4 h-4 mr-1" />Calendar</TabsTrigger>
            <TabsTrigger value="connections"><Plug className="w-4 h-4 mr-1" />Connections</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-4 h-4 mr-1" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Connected accounts</p><p className="text-3xl font-bold">{connected} / {conns.length}</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Social actions logged</p><p className="text-3xl font-bold">{logs.length}</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Last activity</p><p className="text-lg font-semibold">{logs[0] ? format(new Date(logs[0].created_at), "PP p") : "None yet"}</p></CardContent></Card>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {conns.map((c) => { const Icon = META[c.platform]?.icon ?? Plug; return (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{META[c.platform]?.label}</span>
                  <Badge variant={statusVariant(c.status) as any} className="capitalize">{c.status}</Badge>
                </div>); })}
            </div>
          </TabsContent>

          <TabsContent value="inbox"><Soon icon={Inbox} title="Unified inbox — next phase" text="Facebook, Instagram and WhatsApp messages will appear here once the Meta webhook is linked." /></TabsContent>
          <TabsContent value="create"><Soon icon={PenSquare} title="Post composer — next phase" text="For now, use Blog → Social captions to write and post articles to each network." /></TabsContent>
          <TabsContent value="calendar"><Soon icon={CalendarDays} title="Content calendar — next phase" text="Scheduled social posts will show here." /></TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <Card><CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Connect Facebook, Instagram & WhatsApp</p>
                <p className="text-sm text-muted-foreground">One Meta sign-in links all three. Choose the clinic's Page, Instagram and WhatsApp number when asked.</p>
              </div>
              <Button onClick={connectMeta} disabled={connecting}>
                <Facebook className="w-4 h-4 mr-2" />{connecting ? "Opening Meta…" : "Connect with Meta"}
              </Button>
            </CardContent></Card>
            <ManualTokenCard onSaved={load} />
            {conns.map((c) => <ConnectionCard key={c.id + c.updated_at} c={c} onSaved={load} />)}
          </TabsContent>

          <TabsContent value="logs">
            <Card><CardContent className="pt-6">
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">No social activity yet.</p> : (
                <ul className="divide-y">
                  {logs.map((l) => (
                    <li key={l.id} className="py-2 flex justify-between text-sm">
                      <span>{l.action}</span>
                      <span className="text-muted-foreground">{format(new Date(l.created_at), "PP p")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SocialHub;
