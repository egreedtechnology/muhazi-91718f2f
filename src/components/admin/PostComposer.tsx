import { useState } from "react";
import { Facebook, Instagram, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function PostComposer({ onPublished }: { onPublished?: () => void }) {
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fb, setFb] = useState(true);
  const [ig, setIg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});

  const pick = (f: File | null) => {
    if (f && !["image/jpeg", "image/png"].includes(f.type)) return toast({ title: "Use a JPG or PNG photo", variant: "destructive" });
    if (f && f.size > 8 * 1024 * 1024) return toast({ title: "Photo must be under 8MB", variant: "destructive" });
    setFile(f); setPreview(f ? URL.createObjectURL(f) : null);
  };

  const publish = async () => {
    setBusy(true); setLinks({});
    try {
      let image_url = "";
      if (file) {
        const path = `social/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type === "image/png" ? "png" : "jpg"}`;
        const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        image_url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
      }
      const platforms = [fb && "facebook", ig && "instagram"].filter(Boolean);
      const { data, error } = await supabase.functions.invoke("social-post", { body: { caption, image_url, platforms } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const ok: Record<string, string> = {};
      for (const [p, r] of Object.entries<any>(data.results)) {
        if (r.ok) ok[p] = r.url ?? "";
        else toast({ title: `${p} failed`, description: r.error, variant: "destructive" });
      }
      setLinks(ok);
      if (Object.keys(ok).length) {
        toast({ title: "Published", description: `Live on ${Object.keys(ok).join(" and ")}.` });
        setCaption(""); pick(null); onPublished?.();
      }
    } catch (e) {
      toast({ title: "Could not publish", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const canPost = caption.trim() && (fb || ig) && (!ig || file) && !busy;

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div>
        <Label>Caption</Label>
        <Textarea rows={6} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write something for your patients…" />
        <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>
      </div>
      {preview ? (
        <div className="relative w-48">
          <img src={preview} alt="Post photo preview" className="rounded-md w-48 h-48 object-cover" />
          <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={() => pick(null)}><X className="w-4 h-4" /></Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 border border-dashed rounded-md p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted w-fit">
          <ImagePlus className="w-5 h-5" /> Add photo (JPG or PNG)
          <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
      )}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={fb} onCheckedChange={(v) => setFb(!!v)} /><Facebook className="w-4 h-4" /> Facebook</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={ig} onCheckedChange={(v) => setIg(!!v)} /><Instagram className="w-4 h-4" /> Instagram</label>
      </div>
      {ig && !file && <p className="text-xs text-muted-foreground">Instagram needs a photo.</p>}
      <Button onClick={publish} disabled={!canPost}>{busy ? "Publishing…" : "Publish now"}</Button>
      {Object.entries(links).map(([p, url]) => url && (
        <a key={p} href={url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline capitalize">View on {p}</a>
      ))}
    </CardContent></Card>
  );
}
