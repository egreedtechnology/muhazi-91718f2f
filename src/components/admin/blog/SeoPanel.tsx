import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Gauge, BookOpen, Link2 } from "lucide-react";
import type { SeoAudit, Readability, LinkSuggestion } from "@/lib/blog/analysis";

interface Props {
  audit: SeoAudit;
  read: Readability;
  links: LinkSuggestion[];
  onInsertLink: (s: LinkSuggestion) => void;
}

function tone(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 55) return "text-amber-600";
  return "text-destructive";
}

export default function SeoPanel({ audit, read, links, onInsertLink }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" />SEO score</span>
            <span className={`text-2xl font-bold ${tone(audit.score)}`}>{audit.score}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={audit.score} aria-label={`SEO score ${audit.score} out of 100`} />
          <ul className="space-y-1.5">
            {audit.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                {c.passed ? (
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" aria-hidden />
                ) : (
                  <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" aria-hidden />
                )}
                <span className={c.passed ? "text-muted-foreground" : ""}>
                  <span className="font-medium">{c.label}</span>
                  {!c.passed && <span className="block text-muted-foreground">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Readability</span>
            <span className={`text-2xl font-bold ${tone(read.score)}`}>{read.score}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={read.score} aria-label={`Readability score ${read.score} out of 100`} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">{read.label}</Badge>
            <Badge variant="outline">{read.words} words</Badge>
            <Badge variant="outline">{read.avgSentenceLength} words / sentence</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Aim for 60+ so patients of all reading levels can follow the advice.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-primary" />Internal link suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No matches yet. Suggestions appear when your article mentions topics covered by other published posts.
            </p>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.slug} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{l.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">matched “{l.matchedOn}”</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => onInsertLink(l)}>
                    Insert
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
