import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  patientAccountId: string;
  appointments: { id: string; appointment_date: string; status: string; service?: { name?: string } | null }[];
}

type Review = { id: string; appointment_id: string | null; rating: number; feedback: string | null; created_at: string };

function Stars({ value, onChange, size = 6 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
          <Star className={`${size >= 8 ? "w-8 h-8" : size >= 6 ? "w-6 h-6" : "w-4 h-4"} ${n <= value ? "fill-secondary text-secondary" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export default function PatientReviews({ patientAccountId, appointments }: Props) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [visit, setVisit] = useState("general");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("patient_reviews" as any).select("*").eq("patient_account_id", patientAccountId).order("created_at", { ascending: false });
    setReviews((data as any) || []);
  };
  useEffect(() => { load(); }, [patientAccountId]);

  const reviewed = new Set(reviews.map((r) => r.appointment_id));
  const visits = appointments.filter((a) => a.status === "completed" && !reviewed.has(a.id));

  const submit = async () => {
    if (!rating) return toast({ title: "Please choose a star rating", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("patient_reviews" as any).insert({
      patient_account_id: patientAccountId,
      appointment_id: visit === "general" ? null : visit,
      rating,
      feedback: feedback.trim() || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not send review", description: error.message, variant: "destructive" });
    toast({ title: "Thank you for your feedback!" });
    setRating(0); setFeedback(""); setVisit("general");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("patient_reviews" as any).delete().eq("id", id);
    load();
  };

  const label = (id: string | null) => {
    const a = appointments.find((x) => x.id === id);
    return a ? `${a.service?.name ?? "Visit"} · ${format(new Date(a.appointment_date), "PP")}` : "General feedback";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Rate your visit</CardTitle>
          <CardDescription>Your feedback helps us care for you better.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Which visit?</Label>
            <Select value={visit} onValueChange={setVisit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General feedback</SelectItem>
                {visits.map((a) => <SelectItem key={a.id} value={a.id}>{label(a.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="block mb-2">Your rating</Label><Stars value={rating} onChange={setRating} size={8} /></div>
          <div>
            <Label>Comments (optional)</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} rows={4} placeholder="Tell us about your experience" />
          </div>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send review</Button>
        </CardContent>
      </Card>

      {reviews.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">My reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex justify-between gap-3">
                <div className="space-y-1">
                  <Stars value={r.rating} size={4} />
                  <p className="text-xs text-muted-foreground">{label(r.appointment_id)} · {format(new Date(r.created_at), "PP")}</p>
                  {r.feedback && <p className="text-sm">{r.feedback}</p>}
                  {(r as any).staff_reply && (
                    <div className="border-l-4 border-primary bg-muted rounded-r p-2 text-sm">
                      <p className="font-semibold text-primary text-xs">Clinic reply</p>
                      <p>{(r as any).staff_reply}</p>
                    </div>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete review"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
