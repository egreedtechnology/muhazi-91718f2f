import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, ArrowLeft } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error || !data) setNotFound(true);
      else setPost(data as Post);
      setLoading(false);
    })();
  }, [slug]);

  // Inject Article JSON-LD
  useEffect(() => {
    if (!post) return;
    const id = "blog-post-jsonld";
    let s = document.getElementById(id) as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script");
      s.id = id;
      s.type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.meta_description || post.excerpt || "",
      image: post.cover_image_url || undefined,
      datePublished: post.published_at,
      author: { "@type": "Organization", name: "Muhazi Dental Clinic" },
      publisher: {
        "@type": "Organization",
        name: "Muhazi Dental Clinic",
        logo: {
          "@type": "ImageObject",
          url: "https://muhazidentalclinic.org/mdc-logo.jpg",
        },
      },
      mainEntityOfPage: `https://muhazidentalclinic.org/blog/${post.slug}`,
    });
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [post]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Loading…
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !post) {
    return (
      <PublicLayout>
        <SEOHead title="Post Not Found" description="The requested article does not exist." canonical="/blog" />
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold">Post not found</h1>
          <Button asChild variant="outline">
            <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" />Back to Blog</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || post.title}
        canonical={`/blog/${post.slug}`}
        keywords={post.meta_keywords || undefined}
        ogImage={post.cover_image_url || undefined}
        type="article"
      />
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" />All posts</Link>
        </Button>

        <Badge variant="secondary" className="capitalize mb-4">{post.category}</Badge>
        <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight">
          {post.title}
        </h1>
        {post.published_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Calendar className="w-4 h-4" />
            {format(new Date(post.published_at), "MMMM d, yyyy")}
          </div>
        )}

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-2xl mb-8 aspect-video object-cover"
          />
        )}

        <div
          className="prose prose-lg max-w-none prose-headings:font-heading prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
        />
      </article>
    </PublicLayout>
  );
}

// Renders content: if it looks like HTML, pass through; otherwise convert plain-text paragraphs.
function renderContent(content: string): string {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (looksLikeHtml) return content;
  return content
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
