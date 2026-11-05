import { useCallback, useEffect, useState } from "react";
import { Facebook, Instagram, Heart, MessageCircle, Share2, RefreshCw, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Post = { platform: string; id: string; text: string; time: string; url: string; image: string | null; type: string; likes: number; comments: number; shares: number };

export default function SocialFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "facebook" | "instagram">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("social-feed", { body: {} });
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* ignore */ }
      setErrors({ all: msg }); setPosts([]);
    } else { setPosts(data.posts ?? []); setErrors(data.errors ?? {}); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = posts.filter(p => filter === "all" || p.platform === filter);
  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "facebook", "instagram"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      {Object.entries(errors).map(([p, e]) => <p key={p} className="text-sm text-destructive capitalize">{p === "all" ? "" : `${p}: `}{e}</p>)}
      {loading && !posts.length ? <p className="text-sm text-muted-foreground">Loading posts…</p>
        : !shown.length ? <p className="text-sm text-muted-foreground">No posts found on the connected accounts.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(p => (
            <a key={`${p.platform}-${p.id}`} href={p.url} target="_blank" rel="noreferrer" className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col bg-card">
              {p.image ? (
                <div className="relative"><img src={p.image} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                  {p.type.includes("video") && <Film className="absolute top-2 right-2 w-5 h-5 text-primary-foreground drop-shadow" />}</div>
              ) : null}
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {p.platform === "facebook" ? <Facebook className="w-3.5 h-3.5" /> : <Instagram className="w-3.5 h-3.5" />}
                  {new Date(p.time).toLocaleString()}
                </div>
                <p className="text-sm line-clamp-4 whitespace-pre-wrap flex-1">{p.text || <span className="text-muted-foreground">No caption</span>}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{p.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{p.comments}</span>
                  {p.platform === "facebook" && <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" />{p.shares}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
