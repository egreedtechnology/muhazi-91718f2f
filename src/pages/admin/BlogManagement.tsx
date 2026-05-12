import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Eye, FileText, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { slugify, buildExcerpt, buildMetaTitle, buildKeywords, stripHtml } from "@/lib/seo";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  created_at: string;
}

const CATEGORIES = ["general", "dental-tips", "news", "patient-stories", "promotions", "education"];

const empty = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category: "general",
  is_published: false,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
};

export default function BlogManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setPosts((data as Post[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Post) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || "",
      content: p.content,
      cover_image_url: p.cover_image_url || "",
      category: p.category,
      is_published: p.is_published,
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      meta_keywords: p.meta_keywords || "",
    });
    setOpen(true);
  };

  const autoFillSeo = () => {
    const slug = form.slug || slugify(form.title);
    const excerpt = form.excerpt || buildExcerpt(form.content);
    const meta_title = buildMetaTitle(form.title);
    const meta_description = excerpt || stripHtml(form.content).slice(0, 155);
    const meta_keywords = buildKeywords(form.title, form.content, form.category);
    setForm({ ...form, slug, excerpt, meta_title, meta_description, meta_keywords });
    toast({ title: "SEO generated", description: "Slug, excerpt, and meta tags filled from your content." });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const slug = (form.slug || slugify(form.title)).trim();
    const excerpt = (form.excerpt || buildExcerpt(form.content)).trim();
    const meta_title = (form.meta_title || buildMetaTitle(form.title)).trim();
    const meta_description = (form.meta_description || excerpt || stripHtml(form.content).slice(0, 155)).trim();
    const meta_keywords = (form.meta_keywords || buildKeywords(form.title, form.content, form.category)).trim();

    const payload: any = {
      title: form.title.trim(),
      slug,
      excerpt,
      content: form.content,
      cover_image_url: form.cover_image_url.trim() || null,
      category: form.category,
      is_published: form.is_published,
      meta_title,
      meta_description,
      meta_keywords,
      author_id: user?.id || null,
      published_at:
        form.is_published
          ? (editing?.published_at || new Date().toISOString())
          : null,
    };

    let error;
    if (editing) {
      ({ error } = await (supabase as any).from("blog_posts").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("blog_posts").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Post updated" : "Post created", description: form.is_published ? "Live on your site." : "Saved as draft." });
      setOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any).from("blog_posts").delete().eq("id", deleting.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted", description: "Post removed." });
      setPosts(posts.filter((p) => p.id !== deleting.id));
    }
    setDeleting(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Blog Posts</h1>
            <p className="text-muted-foreground">Create, publish, and manage articles. SEO is auto-generated.</p>
          </div>
          <Button variant="hero" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />New Post
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />All Posts ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No posts yet. Click "New Post" to write your first article.</div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40 hover:bg-muted transition-colors gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{p.title}</h3>
                        {p.is_published ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Published</Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                        <Badge variant="secondary" className="capitalize">{p.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">/blog/{p.slug}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {p.is_published && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" title="View live">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(p)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5 Tips for Healthier Gums" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cover image URL</Label>
                <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div>
              <Label>Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={12}
                placeholder="Write your article. Plain text or HTML both work. Separate paragraphs with blank lines."
              />
            </div>

            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />SEO (auto-generated)</p>
                  <p className="text-xs text-muted-foreground">Leave blank to auto-fill on save, or click generate to preview.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={autoFillSeo}>
                  <Sparkles className="w-4 h-4 mr-2" />Generate now
                </Button>
              </div>

              <div>
                <Label>URL slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="auto-generated-from-title" />
              </div>
              <div>
                <Label>Excerpt / meta description</Label>
                <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} maxLength={200} />
              </div>
              <div>
                <Label>Meta title</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} />
              </div>
              <div>
                <Label>Meta keywords</Label>
                <Input value={form.meta_keywords} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} placeholder="comma, separated, keywords" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
              <div>
                <Label className="text-base">Publish</Label>
                <p className="text-xs text-muted-foreground">Toggle on to make this post live on your website.</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Post" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
