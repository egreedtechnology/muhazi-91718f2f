import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, ClipboardCopy, Square, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  posts: { id: string; title: string; slug: string; is_published: boolean; cover_image_url?: string | null }[];
}

type Caption = { platform: string; text: string };

export default function SocialCaptionsDialog({ open, onOpenChange, posts }: Props) {
  const { toast } = useToast();
  const published = posts.filter((p) => p.is_published);
  const [postId, setPostId] = useState("");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!postId) return;
    setBusy(true); setError(null); setCaptions([]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-social`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ postId, language }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", text = "", streamErr = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") text += ev.delta;
            else if (ev.type === "error" || ev.type === "response.failed")
              streamErr = ev.error?.message || ev.response?.error?.message || "AI request failed";
            else if (ev.type === "response.refusal.delta") streamErr = "The AI declined to write captions for this article.";
          } catch { /* partial */ }
        }
      }
      if (streamErr) throw new Error(streamErr);
      if (!text.trim()) throw new Error("The AI returned no captions.");
      const parsed = JSON.parse(text);
      setCaptions(Array.isArray(parsed?.captions) ? parsed.captions : []);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e.message || "Request failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const post = published.find((p) => p.id === postId);
  const articleUrl = post ? `https://muhazidentalclinic.org/blog/${post.slug}` : "";

  const share = async (c: Caption) => {
    const name = c.platform.toLowerCase();
    const u = encodeURIComponent(articleUrl);
    const t = encodeURIComponent(c.text);
    let url = "";
    if (name.includes("facebook")) {
      url = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
      await navigator.clipboard.writeText(c.text).catch(() => {});
      toast({ title: "Caption copied", description: "Paste it into the Facebook post box." });
    } else if (name.includes("linkedin")) {
      url = `https://www.linkedin.com/feed/?shareActive=true&text=${t}`;
    } else if (name === "x" || name.includes("twitter")) {
      url = `https://x.com/intent/post?text=${t}`;
    } else if (name.includes("whatsapp")) {
      url = `https://wa.me/?text=${t}`;
    } else if (name.includes("instagram")) {
      await navigator.clipboard.writeText(c.text).catch(() => {});
      if (post?.cover_image_url) window.open(post.cover_image_url, "_blank", "noopener");
      toast({ title: "Caption copied for Instagram", description: "Instagram has no web posting. Save the cover image, then post it in the Instagram app and paste the caption." });
      return;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer,width=680,height=640");
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: "Caption copied" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) abortRef.current?.abort(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />Social media captions</DialogTitle>
          <DialogDescription>Pick a published article and get ready-to-post, patient-friendly captions.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <Label>Published article</Label>
            <Select value={postId} onValueChange={setPostId}>
              <SelectTrigger><SelectValue placeholder={published.length ? "Choose an article" : "No published articles yet"} /></SelectTrigger>
              <SelectContent>
                {published.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Kinyarwanda">Kinyarwanda</SelectItem>
                <SelectItem value="French">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generate} disabled={!postId || busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
            {busy ? "Writing captions…" : captions.length ? "Regenerate" : "Generate captions"}
          </Button>
          {busy && <Button variant="ghost" onClick={() => abortRef.current?.abort()}><Square className="w-4 h-4 mr-2" />Stop</Button>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {captions.map((c, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{c.platform}</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copy(c.text)}><ClipboardCopy className="w-3 h-3 mr-1" />Copy</Button>
                    <Button size="sm" onClick={() => share(c)}><Share2 className="w-3 h-3 mr-1" />{c.platform.toLowerCase().includes("instagram") ? "Prepare post" : `Post to ${c.platform}`}</Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Review captions before posting. AI drafts can contain mistakes.</p>
      </DialogContent>
    </Dialog>
  );
}
