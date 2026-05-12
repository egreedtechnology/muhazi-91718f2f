import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <PublicLayout>
      <SEOHead
        title="Blog & News"
        description="Dental health tips, clinic updates, and oral care advice from Muhazi Dental Clinic in Rwamagana, Rwanda."
        canonical="/blog"
      />
      <section className="container mx-auto px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3">Blog & News</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tips, updates, and stories from the Muhazi Dental Clinic team.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No posts published yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-all">
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <CardContent className="p-5 space-y-3">
                    <Badge variant="secondary" className="capitalize">
                      {post.category}
                    </Badge>
                    <h2 className="text-xl font-heading font-bold group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    )}
                    {post.published_at && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
