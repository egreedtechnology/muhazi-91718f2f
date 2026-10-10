import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PublicReview = { id: string; rating: number; feedback: string | null; staff_reply: string | null; created_at: string; first_name: string };

const Reviews = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase.rpc as any)("get_public_reviews", { _limit: 100 }).then(({ data }: any) => {
      setReviews(data || []);
      setLoading(false);
    });
  }, []);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <PublicLayout>
      <SEOHead
        title="Patient Reviews | Muhazi Dental Clinic Rwamagana"
        description="Read real reviews from patients of Muhazi Dental Clinic in Rwamagana, Rwanda, and see how our team responds."
        canonical="/reviews"
      />
      <section className="section-padding bg-gradient-to-b from-muted to-background">
        <div className="container-custom max-w-3xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-heading font-bold">What our patients say</h1>
            {reviews.length > 0 && (
              <p className="text-muted-foreground">
                Rated <strong className="text-foreground">{avg.toFixed(1)} / 5</strong> from {reviews.length} reviews
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground">Reviews will appear here soon.</p>
          ) : (
            reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-secondary text-secondary" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.first_name} · {format(new Date(r.created_at), "PP")}</span>
                  </div>
                  {r.feedback && <p>{r.feedback}</p>}
                  {r.staff_reply && (
                    <div className="border-l-4 border-primary bg-muted rounded-r-lg p-3 text-sm">
                      <p className="font-semibold text-primary mb-1">Reply from Muhazi Dental Clinic</p>
                      <p>{r.staff_reply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          <div className="text-center">
            <Button variant="hero" asChild><Link to="/book">Book your visit</Link></Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Reviews;
