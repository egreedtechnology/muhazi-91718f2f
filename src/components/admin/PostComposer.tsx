import { useEffect, useState } from "react";
import { uploadSocialPhoto, uploadSocialVideo } from "@/lib/socialPhoto";
import { Facebook, Instagram, ImagePlus, Film, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MAX_VIDEO = 100 * 1024 * 1024;

export async function invokeError(error: any) {
  let msg = error.message;
  try { msg = (await error.context?.json())?.error ?? msg; } catch { /* ignore */ }
  return msg as string;
}

export default function PostComposer({ onPublished }: { onPublished?: () => void }) {
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fb, setFb] = useState(true);
  const [ig, setIg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<string[]>([]);
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const isVideo = file?.type.startsWith("video/") ?? false;

  const pick = (f: File | null) => {
    if (f && !["image/jpeg", "image/png", "video/mp4", "video/quicktime"].includes(f.type)) return toast({ title: "Use a JPG/PNG photo or an MP4/MOV video", variant: "destructive" });
    if (f && f.type.startsWith("image/") && f.size > 8 * 1024 * 1024) return toast({ title: "Photo must be under 8MB", variant: "destructive" });
    if (f && f.type.startsWith("video/") && f.size > MAX_VIDEO) return toast({ title: "Video must be under 100MB", variant: "destructive" });
    setFile(f); setPreview(f ? URL.createObjectURL(f) : null); setPublished([]);
  };

  const reset = () => { setCaption(""); setFile(null); setPreview(null); setWhen(""); };

  const publish = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { caption };
      if (file) body[isVideo ? "video_url" : "image_url"] = isVideo ? await uploadSocialVideo(file) : await uploadSocialPhoto(file);
      const platforms = [fb && "facebook", ig && "instagram"].filter((p): p is string => typeof p === "string" && !published.includes(p));
      body.platforms = platforms;
      if (later) body.scheduled_at = new Date(when).toISOString();
      const { data, error } = await supabase.functions.invoke("social-post", { body });
      if (error) throw new Error(await invokeError(error));
      if (data.scheduled) {
        toast({ title: "Scheduled", description: `Will post on ${new Date(when).toLocaleString()}. See the Calendar tab.` });
        reset(); onPublished?.();
        return;
      }
      const ok: Record<string, string> = {};
      for (const [p, r] of Object.entries<any>(data.results)) {
        if (r.ok) ok[p] = r.url ?? "";
        else toast({ title: `${p} failed`, description: r.error, variant: "destructive" });
      }
      setLinks(previous => ({ ...previous, ...ok }));
      setPublished(previous => [...new Set([...previous, ...Object.keys(ok)])]);
      if (Object.keys(ok).length) {
        toast({ title: "Published", description: `Live on ${Object.keys(ok).join(" and ")}.${isVideo ? " Videos may take a few minutes to appear." : ""}` });
        if (Object.keys(ok).length === platforms.length) reset();
        onPublished?.();
      }
    } catch (e) {
      toast({ title: later ? "Could not schedule" : "Could not publish", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const whenOk = !later || (when && new Date(when).getTime() > Date.now() + 60_000);
  const canPost = caption.trim() && ((fb && !published.includes("facebook")) || (ig && !published.includes("instagram"))) && (!ig || published.includes("instagram") || file) && whenOk && !busy;
  const minWhen = new Date(Date.now() + 5 * 60_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="social-caption">Caption</Label>
        <Textarea id="social-caption" disabled={busy} rows={6} maxLength={2200} value={caption} onChange={(e) => { setCaption(e.target.value); setPublished([]); }} placeholder="Write something for your patients…" />
        <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>
      </div>
      {preview ? (
        <div className="relative w-48">
          {isVideo
            ? <video src={preview} controls className="rounded-md w-48 h-48 object-cover bg-muted" />
            : <img src={preview} alt="Post photo preview" className="rounded-md w-48 h-48 object-cover" />}
          <Button aria-label="Remove media" disabled={busy} size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={() => pick(null)}><X className="w-4 h-4" /></Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 border border-dashed rounded-md p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted w-fit">
          <ImagePlus className="w-5 h-5" /><Film className="w-5 h-5" /> Add photo or video
          <input type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
      )}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={fb} onCheckedChange={(v) => setFb(!!v)} /><Facebook className="w-4 h-4" /> Facebook</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={ig} onCheckedChange={(v) => setIg(!!v)} /><Instagram className="w-4 h-4" /> Instagram</label>
      </div>
      {ig && !file && <p className="text-xs text-muted-foreground">Instagram needs a photo or video. Videos post as Reels (3–90 seconds).</p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={later} onCheckedChange={(v) => setLater(!!v)} /> Schedule for later</label>
        {later && <Input type="datetime-local" className="w-56" min={minWhen} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Publish date and time" />}
      </div>
      <Button onClick={publish} disabled={!canPost}>{busy ? (file ? "Uploading…" : "Working…") : later ? "Schedule post" : "Publish now"}</Button>
      {Object.entries(links).map(([p, url]) => url && (
        <a key={p} href={url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline capitalize">View on {p}</a>
      ))}
    </div>
  );
}
