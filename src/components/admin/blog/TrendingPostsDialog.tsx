import { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Rocket, FileText, Eye, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { streamAiJson } from "@/lib/blog/aiStream";
import { slugify, buildKeywords } from "@/lib/seo";
import { readingMinutes } from "@/lib/blog/analysis";

type Idea = { title: string; angle: string; why_trending: string; focus_keyword: string; category: string };
type Article = {
  title: string; content_html: string; excerpt: string; meta_title: string; meta_description: string;
  focus_keyword: string; tags: string[]; summary: string; faqs: { question: string; answer: string }[];
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

export default function TrendingPostsDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [articles, setArticles] = useState<Record<number, Article>>({});
  const [writing, setWriting] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, "published" | "draft">>({});
  const [preview, setPreview] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggest = async () => {
    setLoadingIdeas(true); setError(null); setIdeas([]); setArticles({}); setDone({}); setPreview(null);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const r = await streamAiJson<{ ideas: Idea[] }>("blog-trending", { mode: "ideas" }, ctrl.signal);
      setIdeas(r.ideas || []);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e.message);
    } finally { setLoadingIdeas(false); }
  };

  const write = async (i: number): Promise<Article | null> => {
    if (articles[i]) return articles[i];
    setWriting(i); setError(null);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const a = await streamAiJson<Article>("blog-trending", { mode: "article", ...ideas[i] }, ctrl.signal);
      setArticles((s) => ({ ...s, [i]: a }));
      return a;
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e.message);
      return null;
    } finally { setWriting(null); }
  };

  const save = async (i: number, publish: boolean) => {
    const a = await write(i);
    if (!a) return;
    setSaving(i);
    try {
      const idea = ideas[i];
      const content = DOMPurify.sanitize(a.content_html);
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any).from("blog_posts").insert({
        title: a.title.trim(),
        slug: `${slugify(a.title)}-${Date.now().toString(36).slice(-4)}`,
        excerpt: a.excerpt.trim(),
        content,
        category: idea.category || "dental-tips",
        is_published: publish,
        published_at: publish ? now : null,
        meta_title: a.meta_title.trim(),
        meta_description: a.meta_description.trim(),
        meta_keywords: buildKeywords(a.title, content, idea.category),
        focus_keyword: a.focus_keyword.trim() || null,
        tags: a.tags.map((t) => t.trim()).filter(Boolean),
        author_name: "Muhazi Dental Clinic",
        summary: a.summary.trim() || null,
        reading_minutes: readingMinutes(content),
        faqs: a.faqs.filter((f) => f.question && f.answer),
        author_id: user?.id || null,
      }).select("id").maybeSingle();
      if (error) throw error;
      try {
        await (supabase as any).from("activity_logs").insert({
          user_id: user?.id, action: publish ? "blog_post.ai_published" : "blog_post.ai_drafted",
          entity_type: "blog_post", entity_id: data?.id ?? null, details: { title: a.title },
        });
      } catch { /* non-blocking */ }
      setDone((s) => ({ ...s, [i]: publish ? "published" : "draft" }));
      toast({ title: publish ? "Article published" : "Saved as draft", description: a.title });
      onCreated();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  const busy = loadingIdeas || writing !== null || saving !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) abortRef.current?.abort(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />AI trending posts</DialogTitle>
          <DialogDescription>
            Get topic ideas patients are likely searching for now, then write and publish a full article in one click.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={suggest} disabled={busy} className="w-fit">
          {loadingIdeas ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
          {loadingIdeas ? "Finding trending topics…" : ideas.length ? "Suggest new topics" : "Suggest trending topics"}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {ideas.map((idea, i) => {
            const a = articles[i];
            const state = done[i];
            return (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{idea.category.replace("-", " ")}</Badge>
                    <Badge variant="outline">{idea.focus_keyword}</Badge>
                    {state && <Badge className="gap-1"><Check className="w-3 h-3" />{state === "published" ? "Live" : "Draft saved"}</Badge>}
                  </div>
                  <h3 className="font-heading font-semibold">{idea.title}</h3>
                  <p className="text-sm text-muted-foreground">{idea.angle}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium">Why now:</span> {idea.why_trending}</p>
                  {!state && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="hero" disabled={busy} onClick={() => save(i, true)}>
                        {writing === i || saving === i ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Rocket className="w-3 h-3 mr-1" />}
                        {writing === i ? "Writing article…" : saving === i ? "Publishing…" : "Write & publish"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => save(i, false)}>
                        <FileText className="w-3 h-3 mr-1" />Save as draft
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { if (await write(i)) setPreview(preview === i ? null : i); }}>
                        <Eye className="w-3 h-3 mr-1" />{a ? (preview === i ? "Hide preview" : "Preview") : "Preview first"}
                      </Button>
                    </div>
                  )}
                  {preview === i && a && (
                    <div className="rounded-lg border bg-muted/30 p-3 max-h-80 overflow-y-auto">
                      <h2 className="text-lg font-heading font-bold mb-2">{a.title}</h2>
                      <div className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content_html) }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Suggestions are based on common seasonal patient questions, not live search data. Have a clinician review medical content.
        </p>
      </DialogContent>
    </Dialog>
  );
}
