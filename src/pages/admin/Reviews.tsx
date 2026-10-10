import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  staff_reply: string | null;
  replied_at: string | null;
  is_public: boolean;
  patient_account_id: string;
};

const Stars = ({ value }: { value: number }) => (
  <div className="flex gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`w-4 h-4 ${n <= value ? "fill-secondary text-secondary" : "text-muted-foreground"}`} />
    ))}
  </div>
);

const Reviews = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "unanswered" | "public">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("patient_reviews" as any).select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load reviews", description: error.message, variant: "destructive" });
    const rows = (data as unknown as Review[]) || [];
    setReviews(rows);
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, r.staff_reply || ""])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Review>, msg: string) => {
    const { error } = await supabase.from("patient_reviews" as any).update(patch).eq("id", id);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: msg });
    load();
  };

  const saveReply = async (id: string) => {
    const text = (drafts[id] || "").trim();
    const { data: u } = await supabase.auth.getUser();
    update(id, { staff_reply: text || null, replied_at: text ? new Date().toISOString() : null, replied_by: text ? u.user?.id : null } as any, text ? "Reply saved" : "Reply removed");
  };

  const shown = reviews.filter((r) => filter === "all" || (filter === "unanswered" ? !r.staff_reply : r.is_public));
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "–";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Patient reviews</h1>
            <p className="text-muted-foreground text-sm">{reviews.length} reviews · average {avg} / 5</p>
          </div>
          <div className="flex gap-2">
            {(["all", "unanswered", "public"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "unanswered" ? "Needs reply" : "On website"}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-muted-foreground">No reviews here yet.</p>
        ) : (
          shown.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                    {r.staff_reply ? <Badge variant="secondary">Replied</Badge> : <Badge variant="outline">Needs reply</Badge>}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    Show on website
                    <Switch checked={r.is_public} onCheckedChange={(v) => update(r.id, { is_public: v }, v ? "Now shown on website" : "Hidden from website")} />
                  </label>
                </div>
                <p className="text-sm">{r.feedback || <span className="italic text-muted-foreground">No written feedback</span>}</p>
                <Textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Write a reply from the clinic (patients see it in their portal; shown on the website if public)"
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => saveReply(r.id)} disabled={(drafts[r.id] || "") === (r.staff_reply || "")}>
                    Save reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default Reviews;
