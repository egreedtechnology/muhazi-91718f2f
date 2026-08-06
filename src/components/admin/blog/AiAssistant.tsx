import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ClipboardCopy, CornerDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Task =
  | "outline" | "expand" | "grammar" | "rewrite" | "seo_titles"
  | "faqs" | "summary" | "internal_links" | "image_ideas" | "social";

const TASKS: { id: Task; label: string; insertable: boolean }[] = [
  { id: "outline", label: "Generate outline", insertable: true },
  { id: "expand", label: "Expand paragraphs", insertable: true },
  { id: "grammar", label: "Fix grammar", insertable: true },
  { id: "rewrite", label: "Rewrite professionally", insertable: true },
  { id: "seo_titles", label: "Suggest SEO titles", insertable: false },
  { id: "faqs", label: "Generate FAQs", insertable: false },
  { id: "summary", label: "Write summary", insertable: false },
  { id: "internal_links", label: "Internal link ideas", insertable: false },
  { id: "image_ideas", label: "Image ideas", insertable: false },
  { id: "social", label: "Social captions", insertable: false },
];

interface Props {
  title: string;
  content: string;
  keyword: string;
  onInsert: (html: string) => void;
  onReplace: (html: string) => void;
  onSummary: (text: string) => void;
  onFaqs: (faqs: { question: string; answer: string }[]) => void;
}

export default function AiAssistant({ title, content, keyword, onInsert, onReplace, onSummary, onFaqs }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<Task | null>(null);
  const [result, setResult] = useState<{ task: Task; html: string } | null>(null);

  const run = async (task: Task) => {
    setBusy(task);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai", {
        body: { task, title, content, keyword },
      });
      if (error) {
        const details = (error as any)?.context ? await (error as any).context.text() : error.message;
        let msg = details;
        try { msg = JSON.parse(details)?.error || details; } catch { /* plain text */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const output: string = data.result || "";
      if (task === "summary") {
        onSummary(output.replace(/<[^>]*>/g, "").trim());
        toast({ title: "Summary added", description: "The article summary field has been filled." });
      } else if (task === "faqs") {
        try {
          const parsed = JSON.parse(output);
          if (Array.isArray(parsed)) {
            onFaqs(parsed.filter((f) => f?.question && f?.answer));
            toast({ title: "FAQs generated", description: `${parsed.length} questions added to the FAQ list.` });
          } else throw new Error("bad shape");
        } catch {
          setResult({ task, html: `<pre>${escapeHtml(output)}</pre>` });
        }
      } else {
        setResult({ task, html: output });
      }
    } catch (e: any) {
      toast({ title: "AI assistant", description: e.message || "Request failed", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const current = TASKS.find((t) => t.id === result?.task);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" />AI writing assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {TASKS.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              size="sm"
              className="justify-start h-auto py-2 text-xs"
              disabled={!!busy}
              onClick={() => run(t.id)}
            >
              {busy === t.id ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
              {t.label}
            </Button>
          ))}
        </div>

        {result && (
          <div className="rounded-lg border bg-muted/30">
            <ScrollArea className="max-h-64">
              <div
                className="prose prose-sm max-w-none p-3 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: result.html }}
              />
            </ScrollArea>
            <div className="flex flex-wrap gap-2 border-t p-2">
              {current?.insertable && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => { onInsert(result.html); setResult(null); }}>
                    <CornerDownLeft className="w-3 h-3 mr-1" />Insert at cursor
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { onReplace(result.html); setResult(null); }}>
                    Replace article
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(result.html.replace(/<[^>]*>/g, "\n").replace(/\n{2,}/g, "\n").trim());
                  toast({ title: "Copied to clipboard" });
                }}
              >
                <ClipboardCopy className="w-3 h-3 mr-1" />Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Dismiss</Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          AI drafts are a starting point. Always have a clinician review medical content before publishing.
        </p>
      </CardContent>
    </Card>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
