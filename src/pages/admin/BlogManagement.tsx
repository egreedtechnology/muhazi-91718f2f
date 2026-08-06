import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, FileText, ExternalLink, Sparkles, Search, Eye, Star,
  History, Clock, RotateCcw, Loader2, CheckCircle2, Save, X, Upload, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { slugify, buildExcerpt, buildMetaTitle, buildKeywords, stripHtml } from "@/lib/seo";
import { auditSeo, readability, readingMinutes, suggestInternalLinks, type LinkSuggestion } from "@/lib/blog/analysis";
import RichEditor, { uploadBlogImage } from "@/components/admin/blog/RichEditor";
import AiAssistant from "@/components/admin/blog/AiAssistant";
import SeoPanel from "@/components/admin/blog/SeoPanel";

interface Faq { question: string; answer: string }

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
  updated_at: string | null;
  focus_keyword: string | null;
  tags: string[] | null;
  author_name: string | null;
  medical_reviewer: string | null;
  reading_minutes: number | null;
  summary: string | null;
  is_featured: boolean;
  scheduled_at: string | null;
  cover_image_alt: string | null;
  view_count: number;
  faqs: Faq[] | null;
}

interface Revision {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  note: string | null;
  created_at: string;
}

const CATEGORIES = ["general", "dental-tips", "news", "patient-stories", "promotions", "education"];

const empty = {
  title: "", slug: "", excerpt: "", content: "", cover_image_url: "", cover_image_alt: "",
  category: "general", is_published: false, meta_title: "", meta_description: "", meta_keywords: "",
  focus_keyword: "", tags: "", author_name: "", medical_reviewer: "", summary: "",
  is_featured: false, scheduled_at: "",
};
type FormState = typeof empty;

export default function BlogManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [saving, setSaving] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  // list controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const logActivity = async (action: string, entityId: string | null, details?: Record<string, unknown>) => {
    try {
      await (supabase as any).from("activity_logs").insert({
        user_id: user?.id ?? null,
        action,
        entity_type: "blog_post",
        entity_id: entityId,
        details: details ?? null,
      });
    } catch { /* logging must never block editing */ }
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("blog_posts").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      const rows = (data as Post[]) || [];
      setPosts(rows);
      void releaseScheduled(rows);
    }
    setLoading(false);
  };

  /** Publishes any draft whose scheduled time has passed. */
  const releaseScheduled = async (rows: Post[]) => {
    const now = Date.now();
    const due = rows.filter((p) => !p.is_published && p.scheduled_at && new Date(p.scheduled_at).getTime() <= now);
    if (!due.length) return;
    for (const p of due) {
      await (supabase as any).from("blog_posts")
        .update({ is_published: true, published_at: p.scheduled_at, scheduled_at: null })
        .eq("id", p.id);
      void logActivity("blog_post.scheduled_publish", p.id, { title: p.title });
    }
    toast({ title: "Scheduled posts published", description: `${due.length} article(s) went live.` });
    const { data } = await (supabase as any).from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data as Post[]) || []);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, author_name: "Muhazi Dental Clinic" });
    setFaqs([]);
    setRevisions([]);
    setLastSavedAt(null);
    setOpen(true);
  };

  const openEdit = async (p: Post) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt || "", content: p.content,
      cover_image_url: p.cover_image_url || "", cover_image_alt: p.cover_image_alt || "",
      category: p.category, is_published: p.is_published,
      meta_title: p.meta_title || "", meta_description: p.meta_description || "",
      meta_keywords: p.meta_keywords || "", focus_keyword: p.focus_keyword || "",
      tags: (p.tags || []).join(", "), author_name: p.author_name || "",
      medical_reviewer: p.medical_reviewer || "", summary: p.summary || "",
      is_featured: p.is_featured, scheduled_at: p.scheduled_at ? p.scheduled_at.slice(0, 16) : "",
    });
    setFaqs(Array.isArray(p.faqs) ? p.faqs : []);
    setLastSavedAt(p.updated_at ? new Date(p.updated_at) : null);
    setOpen(true);
    loadRevisions(p.id);
  };

  const loadRevisions = async (postId: string) => {
    const { data } = await (supabase as any)
      .from("blog_revisions").select("*").eq("post_id", postId)
      .order("created_at", { ascending: false }).limit(30);
    setRevisions((data as Revision[]) || []);
  };

  // ---- analysis -------------------------------------------------------------
  const tagList = useMemo(
    () => form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    [form.tags],
  );

  const audit = useMemo(
    () => auditSeo({
      title: form.title, slug: form.slug || slugify(form.title), content: form.content,
      metaTitle: form.meta_title || buildMetaTitle(form.title || "Untitled"),
      metaDescription: form.meta_description || form.excerpt,
      focusKeyword: form.focus_keyword, coverImageUrl: form.cover_image_url,
      coverImageAlt: form.cover_image_alt, tags: tagList,
    }),
    [form, tagList],
  );

  const read = useMemo(() => readability(form.content), [form.content]);

  const linkSuggestions = useMemo(
    () => suggestInternalLinks(
      form.content,
      posts.filter((p) => p.is_published && p.id !== editing?.id)
        .map((p) => ({ title: p.title, slug: p.slug, focus_keyword: p.focus_keyword })),
    ),
    [form.content, posts, editing],
  );

  // ---- payload / save -------------------------------------------------------
  const buildPayload = useCallback((state: FormState, faqList: Faq[], existing: Post | null) => {
    const slug = (state.slug || slugify(state.title)).trim();
    const excerpt = (state.excerpt || buildExcerpt(state.content)).trim();
    const meta_title = (state.meta_title || buildMetaTitle(state.title)).trim();
    const meta_description = (state.meta_description || excerpt || stripHtml(state.content).slice(0, 155)).trim();
    const meta_keywords = (state.meta_keywords || buildKeywords(state.title, state.content, state.category)).trim();
    const scheduled = state.scheduled_at ? new Date(state.scheduled_at).toISOString() : null;
    const scheduledFuture = !!scheduled && new Date(scheduled).getTime() > Date.now();
    const live = state.is_published && !scheduledFuture;

    return {
      title: state.title.trim(),
      slug,
      excerpt,
      content: state.content,
      cover_image_url: state.cover_image_url.trim() || null,
      cover_image_alt: state.cover_image_alt.trim() || null,
      category: state.category,
      is_published: live,
      meta_title, meta_description, meta_keywords,
      focus_keyword: state.focus_keyword.trim() || null,
      tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
      author_name: state.author_name.trim() || null,
      medical_reviewer: state.medical_reviewer.trim() || null,
      summary: state.summary.trim() || null,
      reading_minutes: readingMinutes(state.content),
      is_featured: state.is_featured,
      scheduled_at: scheduledFuture ? scheduled : null,
      faqs: faqList.filter((f) => f.question.trim() && f.answer.trim()),
      author_id: user?.id || null,
      published_at: live ? (existing?.published_at || new Date().toISOString()) : existing?.published_at ?? null,
    };
  }, [user]);

  const persist = useCallback(
    async (state: FormState, faqList: Faq[], silent: boolean): Promise<Post | null> => {
      const payload = buildPayload(state, faqList, editing);
      if (editing) {
        const { data, error } = await (supabase as any)
          .from("blog_posts").update(payload).eq("id", editing.id).select().maybeSingle();
        if (error) throw error;
        if (!silent) void logActivity("blog_post.updated", editing.id, { title: payload.title });
        return data as Post;
      }
      const { data, error } = await (supabase as any)
        .from("blog_posts").insert(payload).select().maybeSingle();
      if (error) throw error;
      void logActivity("blog_post.created", data?.id ?? null, { title: payload.title });
      return data as Post;
    },
    [buildPayload, editing],
  );

  // Auto-save every 25s while the dialog is open and there is a title + content.
  const formRef = useRef(form);
  const faqRef = useRef(faqs);
  formRef.current = form;
  faqRef.current = faqs;

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(async () => {
      const state = formRef.current;
      if (!state.title.trim() || !state.content.trim() || saving) return;
      setAutoSaving(true);
      try {
        const saved = await persist(state, faqRef.current, true);
        if (saved && !editing) setEditing(saved);
        setLastSavedAt(new Date());
      } catch { /* auto-save is best effort */ }
      finally { setAutoSaving(false); }
    }, 25000);
    return () => window.clearInterval(timer);
  }, [open, persist, editing, saving]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const wasEditing = editing;
      const saved = await persist(form, faqs, false);

      // Snapshot a revision after every manual save.
      if (saved?.id && user?.id) {
        await (supabase as any).from("blog_revisions").insert({
          post_id: saved.id, title: form.title, content: form.content,
          excerpt: form.excerpt || null, note: wasEditing ? "Manual save" : "Initial version",
          created_by: user.id,
        });
      }

      const scheduledFuture = form.scheduled_at && new Date(form.scheduled_at).getTime() > Date.now();
      toast({
        title: wasEditing ? "Post updated" : "Post created",
        description: scheduledFuture
          ? `Scheduled to publish ${format(new Date(form.scheduled_at), "MMM d, yyyy 'at' HH:mm")}.`
          : form.is_published ? "Live on your site." : "Saved as draft.",
      });
      setLastSavedAt(new Date());
      setOpen(false);
      setFullScreen(false);
      fetchPosts();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const restoreRevision = (r: Revision) => {
    setForm((f) => ({ ...f, title: r.title, content: r.content, excerpt: r.excerpt || f.excerpt }));
    toast({ title: "Revision loaded", description: "Review it and click Save to keep this version." });
  };

  const handleCover = async (file: File | undefined) => {
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadBlogImage(file);
      setForm((f) => ({ ...f, cover_image_url: url }));
      toast({ title: "Cover uploaded", description: "Compressed and converted to WebP." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const autoFillSeo = () => {
    const slug = form.slug || slugify(form.title);
    const excerpt = form.excerpt || buildExcerpt(form.content);
    setForm({
      ...form, slug, excerpt,
      meta_title: buildMetaTitle(form.title),
      meta_description: excerpt || stripHtml(form.content).slice(0, 155),
      meta_keywords: buildKeywords(form.title, form.content, form.category),
    });
    toast({ title: "SEO generated", description: "Slug, excerpt, and meta tags filled from your content." });
  };

  // ---- list operations ------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter === "published" && !p.is_published) return false;
      if (statusFilter === "draft" && (p.is_published || p.scheduled_at)) return false;
      if (statusFilter === "scheduled" && !p.scheduled_at) return false;
      if (statusFilter === "featured" && !p.is_featured) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, search, statusFilter, categoryFilter]);

  const totalViews = useMemo(() => posts.reduce((s, p) => s + (p.view_count || 0), 0), [posts]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkUpdate = async (patch: Record<string, unknown>, label: string) => {
    const ids = [...selected];
    if (!ids.length) return;
    const { error } = await (supabase as any).from("blog_posts").update(patch).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      void logActivity("blog_post.bulk_update", null, { ids, patch });
      toast({ title: label, description: `${ids.length} post(s) updated.` });
      setSelected(new Set());
      fetchPosts();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any).from("blog_posts").delete().eq("id", deleting.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      void logActivity("blog_post.deleted", deleting.id, { title: deleting.title });
      toast({ title: "Deleted", description: "Post removed." });
      setPosts(posts.filter((p) => p.id !== deleting.id));
    }
    setDeleting(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    const { error } = await (supabase as any).from("blog_posts").delete().in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      void logActivity("blog_post.bulk_deleted", null, { ids });
      toast({ title: "Deleted", description: `${ids.length} post(s) removed.` });
      setSelected(new Set());
      fetchPosts();
    }
    setBulkDelete(false);
  };

  const statusOf = (p: Post) => {
    if (p.is_published) return { label: "Published", cls: "bg-green-500/10 text-green-600 border-green-500/20" };
    if (p.scheduled_at) return { label: "Scheduled", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    return { label: "Draft", cls: "" };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Blog Studio</h1>
            <p className="text-muted-foreground">Write, review and publish medical articles with built-in SEO.</p>
          </div>
          <Button variant="hero" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />New Post
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total posts" value={posts.length} icon={FileText} />
          <Stat label="Published" value={posts.filter((p) => p.is_published).length} icon={CheckCircle2} />
          <Stat label="Scheduled" value={posts.filter((p) => p.scheduled_at).length} icon={Clock} />
          <Stat label="Total views" value={totalViews} icon={Eye} />
        </div>

        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" />All posts ({filtered.length})
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                <Input
                  className="pl-9"
                  placeholder="Search title, slug, or tag…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search posts"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
                  <Filter className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-44" aria-label="Filter by category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
                <span className="text-sm font-medium px-1">{selected.size} selected</span>
                <Button size="sm" variant="outline" onClick={() => bulkUpdate({ is_published: true, published_at: new Date().toISOString() }, "Published")}>Publish</Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdate({ is_published: false }, "Unpublished")}>Unpublish</Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdate({ is_featured: true }, "Featured")}>Feature</Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdate({ is_featured: false }, "Unfeatured")}>Unfeature</Button>
                <Button size="sm" variant="destructive" onClick={() => setBulkDelete(true)}>Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="w-4 h-4" /></Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {posts.length === 0 ? "No posts yet. Click “New Post” to write your first article." : "No posts match these filters."}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => {
                  const st = statusOf(p);
                  return (
                    <div key={p.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 hover:bg-muted transition-colors">
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                        aria-label={`Select ${p.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{p.title}</h3>
                          <Badge variant={st.label === "Draft" ? "outline" : undefined} className={st.cls}>{st.label}</Badge>
                          {p.is_featured && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Star className="w-3 h-3 mr-1" />Featured
                            </Badge>
                          )}
                          <Badge variant="secondary" className="capitalize">{p.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">/blog/{p.slug}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span>{format(new Date(p.created_at), "MMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.view_count || 0} views</span>
                          {p.reading_minutes ? <span>{p.reading_minutes} min read</span> : null}
                          {p.scheduled_at && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-3 h-3" />{format(new Date(p.scheduled_at), "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {p.is_published && (
                          <Button variant="ghost" size="icon" asChild aria-label={`View ${p.title} live`}>
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label={`Edit ${p.title}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Editor ---------------- */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFullScreen(false); }}>
        <DialogContent className="max-w-[95vw] xl:max-w-[1200px] max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              {editing ? "Edit post" : "New post"}
              {autoSaving && <span className="text-xs font-normal text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Auto-saving…</span>}
              {!autoSaving && lastSavedAt && (
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Save className="w-3 h-3" />Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="write" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="shrink-0 w-full justify-start overflow-x-auto">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="faq">FAQs</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="revisions">History</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 pr-3">
              <TabsContent value="write" className="mt-4 space-y-4">
                <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
                  <div className="space-y-4 min-w-0">
                    <div className="space-y-1.5">
                      <Label htmlFor="post-title">Title *</Label>
                      <Input
                        id="post-title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Tooth Extraction Aftercare: A Complete Guide"
                        className="text-lg"
                      />
                    </div>
                    <RichEditor
                      value={form.content}
                      onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                      fullScreen={fullScreen}
                      onToggleFullScreen={() => setFullScreen((v) => !v)}
                    />
                  </div>
                  <AiAssistant
                    title={form.title}
                    content={form.content}
                    keyword={form.focus_keyword}
                    onInsert={(html) => setForm((f) => ({ ...f, content: f.content + html }))}
                    onReplace={(html) => setForm((f) => ({ ...f, content: html }))}
                    onSummary={(text) => setForm((f) => ({ ...f, summary: text }))}
                    onFaqs={(list) => setFaqs(list)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Category">
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tags (comma separated)" htmlFor="post-tags">
                    <Input id="post-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="oral hygiene, prevention, children" />
                  </Field>
                  <Field label="Author" htmlFor="post-author">
                    <Input id="post-author" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} placeholder="Dr. Jane Doe" />
                  </Field>
                  <Field label="Medical reviewer" htmlFor="post-reviewer">
                    <Input id="post-reviewer" value={form.medical_reviewer} onChange={(e) => setForm({ ...form, medical_reviewer: e.target.value })} placeholder="Dr. John Smith, BDS" />
                  </Field>
                </div>

                <Field label="Summary" htmlFor="post-summary" hint="Shown at the top of the article and used for previews.">
                  <Textarea id="post-summary" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                </Field>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Featured image URL" htmlFor="post-cover">
                    <div className="flex gap-2">
                      <Input id="post-cover" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://…" />
                      <Button type="button" variant="outline" size="icon" onClick={() => coverInputRef.current?.click()} disabled={coverUploading} aria-label="Upload featured image">
                        {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCover(e.target.files?.[0])} />
                    </div>
                  </Field>
                  <Field label="Featured image alt text" htmlFor="post-cover-alt">
                    <Input id="post-cover-alt" value={form.cover_image_alt} onChange={(e) => setForm({ ...form, cover_image_alt: e.target.value })} placeholder="Dentist examining a patient's teeth" />
                  </Field>
                </div>

                {form.cover_image_url && (
                  <img src={form.cover_image_url} alt={form.cover_image_alt || "Featured image preview"} className="rounded-lg max-h-48 object-cover w-full" loading="lazy" />
                )}

                <Separator />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
                    <div>
                      <Label className="text-base">Publish</Label>
                      <p className="text-xs text-muted-foreground">Make this article live.</p>
                    </div>
                    <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} aria-label="Publish post" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
                    <div>
                      <Label className="text-base">Featured article</Label>
                      <p className="text-xs text-muted-foreground">Highlight at the top of the blog.</p>
                    </div>
                    <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} aria-label="Feature post" />
                  </div>
                </div>

                <Field label="Scheduled publish" htmlFor="post-schedule" hint="Leave empty to publish immediately. Scheduled posts go live automatically.">
                  <Input id="post-schedule" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </Field>

                {editing?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {format(new Date(editing.updated_at), "MMMM d, yyyy 'at' HH:mm")} · {readingMinutes(form.content)} min read · {editing.view_count || 0} views
                  </p>
                )}
              </TabsContent>

              <TabsContent value="seo" className="mt-4">
                <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm text-muted-foreground">Fields left blank are auto-generated when you save.</p>
                      <Button type="button" variant="outline" size="sm" onClick={autoFillSeo}>
                        <Sparkles className="w-4 h-4 mr-2" />Auto-generate
                      </Button>
                    </div>
                    <Field label="Focus keyword" htmlFor="seo-focus" hint="The single phrase this article should rank for.">
                      <Input id="seo-focus" value={form.focus_keyword} onChange={(e) => setForm({ ...form, focus_keyword: e.target.value })} placeholder="tooth extraction aftercare" />
                    </Field>
                    <Field label="URL slug" htmlFor="seo-slug" hint={editing ? "Changing this changes the article's public URL." : undefined}>
                      <Input id="seo-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="auto-generated-from-title" />
                    </Field>
                    <Field label={`SEO title (${form.meta_title.length}/60)`} htmlFor="seo-title">
                      <Input id="seo-title" value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} />
                    </Field>
                    <Field label={`Meta description (${form.meta_description.length}/160)`} htmlFor="seo-desc">
                      <Textarea id="seo-desc" rows={3} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={200} />
                    </Field>
                    <Field label="Excerpt" htmlFor="seo-excerpt" hint="Shown on the blog listing cards.">
                      <Textarea id="seo-excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={200} />
                    </Field>
                    <Field label="Meta keywords" htmlFor="seo-kw">
                      <Input id="seo-kw" value={form.meta_keywords} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} placeholder="comma, separated, keywords" />
                    </Field>

                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Google preview</p>
                      <p className="text-xs text-green-700">muhazi.lovable.app › blog › {form.slug || slugify(form.title) || "your-article"}</p>
                      <p className="text-[#1a0dab] text-lg leading-snug">{form.meta_title || buildMetaTitle(form.title || "Untitled")}</p>
                      <p className="text-sm text-muted-foreground">{form.meta_description || form.excerpt || buildExcerpt(form.content)}</p>
                    </div>
                  </div>

                  <SeoPanel
                    audit={audit}
                    read={read}
                    links={linkSuggestions}
                    onInsertLink={(l: LinkSuggestion) =>
                      setForm((f) => ({ ...f, content: f.content + `<p>Read more: <a href="/blog/${l.slug}">${l.title}</a></p>` }))
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="faq" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  FAQs appear as an accordion on the article and are published as FAQ structured data for Google.
                </p>
                {faqs.map((f, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={f.question}
                        placeholder="Question"
                        onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                        aria-label={`FAQ question ${i + 1}`}
                      />
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))} aria-label={`Remove FAQ ${i + 1}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={f.answer}
                      placeholder="Answer"
                      onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                      aria-label={`FAQ answer ${i + 1}`}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
                  <Plus className="w-4 h-4 mr-2" />Add FAQ
                </Button>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <article className="mx-auto max-w-3xl">
                  <h1 className="text-3xl font-heading font-bold mb-2">{form.title || "Untitled article"}</h1>
                  {form.summary && <p className="text-lg text-muted-foreground mb-6">{form.summary}</p>}
                  {form.cover_image_url && (
                    <img src={form.cover_image_url} alt={form.cover_image_alt || ""} className="rounded-xl w-full mb-6" loading="lazy" />
                  )}
                  <div className="blog-article prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: form.content }} />
                </article>
              </TabsContent>

              <TabsContent value="revisions" className="mt-4 space-y-3">
                {!editing ? (
                  <p className="text-sm text-muted-foreground">Save this post once to start tracking revision history.</p>
                ) : revisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No revisions recorded yet.</p>
                ) : (
                  revisions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          <History className="w-3 h-3 inline mr-1" />
                          {format(new Date(r.created_at), "MMM d, yyyy 'at' HH:mm")}
                          {r.note ? ` · ${r.note}` : ""} · {stripHtml(r.content).split(/\s+/).filter(Boolean).length} words
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => restoreRevision(r)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="shrink-0 border-t pt-4">
            <div className="mr-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span>SEO {audit.score}</span>
              <span>Readability {read.score}</span>
              <span>{readingMinutes(form.content)} min read</span>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editing ? "Update post" : "Create post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDelete} onOpenChange={setBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} post(s)?</AlertDialogTitle>
            <AlertDialogDescription>These articles will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">Delete all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label, htmlFor, hint, children,
}: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
