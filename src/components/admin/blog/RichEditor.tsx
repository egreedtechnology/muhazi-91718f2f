import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Minus, Table as TableIcon, ImagePlus, Link2,
  Undo2, Redo2, Video, FileText, AlignLeft, AlignCenter, AlignRight, Code2,
  Maximize2, Minimize2, LayoutTemplate, AlertTriangle, Columns2, ChevronDown, Upload, Loader2,
} from "lucide-react";
import { MEDICAL_BLOCKS, CALLOUT_VARIANTS, calloutHtml } from "@/lib/blog/medicalBlocks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}

/** Compresses an image in-browser and converts to WebP before upload. */
async function compressToWebp(file: File, maxWidth = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/webp",
      0.82,
    ),
  );
}

export async function uploadBlogImage(file: File): Promise<string> {
  const blob = await compressToWebp(file);
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage
    .from("gallery")
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return data.publicUrl;
}

export default function RichEditor({ value, onChange, fullScreen, onToggleFullScreen }: RichEditorProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [embedOpen, setEmbedOpen] = useState<null | "video" | "pdf" | "button">(null);
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedLabel, setEmbedLabel] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Placeholder.configure({
        placeholder: "Start writing, or insert a medical section from the Sections menu…",
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy", decoding: "async" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ width: 720, height: 405, nocookie: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "blog-editor-surface prose prose-slate max-w-none focus:outline-none",
        "aria-label": "Article content editor",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep external resets (e.g. opening a different post) in sync.
  const lastValue = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value !== lastValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    lastValue.current = value;
  }, [value, editor]);

  const insertHtml = useCallback(
    (html: string) => {
      editor?.chain().focus().insertContent(html).run();
    },
    [editor],
  );

  const handleUpload = async (files: FileList | null, asGallery: boolean) => {
    if (!files?.length || !editor) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadBlogImage(f));
      if (asGallery && urls.length > 1) {
        insertHtml(
          `<div class="blog-gallery">${urls
            .map((u) => `<img src="${u}" alt="" loading="lazy" decoding="async" />`)
            .join("")}</div><p></p>`,
        );
      } else {
        urls.forEach((u) => editor.chain().focus().setImage({ src: u, alt: "" }).run());
      }
      toast({ title: "Uploaded", description: `${urls.length} image(s) added and converted to WebP.` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const applyLink = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
    setLinkUrl("");
  };

  const applyEmbed = () => {
    const url = embedUrl.trim();
    if (!url || !editor) return setEmbedOpen(null);
    if (embedOpen === "video") {
      if (/youtu\.?be/.test(url)) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      else insertHtml(`<div class="blog-embed"><video src="${url}" controls preload="metadata"></video></div><p></p>`);
    } else if (embedOpen === "pdf") {
      insertHtml(
        `<div class="blog-embed blog-embed-pdf"><a href="${url}" target="_blank" rel="noopener noreferrer">${
          embedLabel.trim() || "Open PDF document"
        }</a></div><p></p>`,
      );
    } else if (embedOpen === "button") {
      insertHtml(`<p><a class="blog-cta-button" href="${url}">${embedLabel.trim() || "Learn more"}</a></p>`);
    }
    setEmbedOpen(null);
    setEmbedUrl("");
    setEmbedLabel("");
  };

  if (!editor) return <div className="h-64 rounded-lg border animate-pulse bg-muted/40" />;

  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "rounded-lg border overflow-hidden"}>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-2 sticky top-0 z-10">
          <TB editor={editor} icon={Undo2} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <TB editor={editor} icon={Redo2} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
          <Sep />
          <TB editor={editor} icon={Bold} label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <TB editor={editor} icon={Italic} label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <TB editor={editor} icon={UnderlineIcon} label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <TB editor={editor} icon={Strikethrough} label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <TB editor={editor} icon={Code2} label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
          <Sep />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Heading2 className="w-4 h-4" />Headings<ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>Paragraph</DropdownMenuItem>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <DropdownMenuItem key={l} onClick={() => editor.chain().focus().toggleHeading({ level: l as any }).run()}>
                  Heading {l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <TB editor={editor} icon={List} label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <TB editor={editor} icon={ListOrdered} label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <TB editor={editor} icon={ListChecks} label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
          <TB editor={editor} icon={Quote} label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <TB editor={editor} icon={Minus} label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <Sep />
          <TB editor={editor} icon={AlignLeft} label="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()} />
          <TB editor={editor} icon={AlignCenter} label="Align centre" onClick={() => editor.chain().focus().setTextAlign("center").run()} />
          <TB editor={editor} icon={AlignRight} label="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()} />
          <Sep />
          <TB editor={editor} icon={Link2} label="Link" active={editor.isActive("link")} onClick={() => { setLinkUrl(editor.getAttributes("link").href || ""); setLinkOpen(true); }} />
          <TB editor={editor} icon={ImagePlus} label="Insert image" onClick={() => fileRef.current?.click()} />
          <TB editor={editor} icon={Video} label="Embed video" onClick={() => setEmbedOpen("video")} />
          <TB editor={editor} icon={FileText} label="Embed PDF" onClick={() => setEmbedOpen("pdf")} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <TableIcon className="w-4 h-4" />Table<ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert 3×3 table</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sep />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <LayoutTemplate className="w-4 h-4" />Sections<ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-64">
              <DropdownMenuLabel>Medical content blocks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MEDICAL_BLOCKS.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => insertHtml(b.html)} className="flex-col items-start gap-0.5">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <AlertTriangle className="w-4 h-4" />Callout<ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {CALLOUT_VARIANTS.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => insertHtml(calloutHtml(c.className, c.title, "Write your message here."))}>
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Columns2 className="w-4 h-4" />Layout<ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => insertHtml('<div class="blog-columns"><div><p>Left column</p></div><div><p>Right column</p></div></div><p></p>')}>Two columns</DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertHtml('<details class="blog-accordion"><summary>Accordion title</summary><p>Hidden content.</p></details><p></p>')}>Accordion</DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertHtml('<div class="blog-tabs"><details class="blog-accordion" open><summary>Tab one</summary><p>First tab content.</p></details><details class="blog-accordion"><summary>Tab two</summary><p>Second tab content.</p></details></div><p></p>')}>Tabbed sections</DropdownMenuItem>
              <DropdownMenuItem onClick={() => galleryRef.current?.click()}>Image gallery…</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEmbedOpen("button")}>Button…</DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertHtml('<div class="blog-compare"><figure><img src="" alt="Before treatment" loading="lazy" /><figcaption>Before</figcaption></figure><figure><img src="" alt="After treatment" loading="lazy" /><figcaption>After</figcaption></figure></div><p></p>')}>Before &amp; after</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="sm" className="h-8" onClick={onToggleFullScreen}>
              {fullScreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}
              {fullScreen ? "Exit" : "Full screen"}
            </Button>
          </div>
        </div>
      </TooltipProvider>

      <div className={fullScreen ? "flex-1 overflow-y-auto" : ""}>
        <EditorContent editor={editor} />
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files, false)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files, true)} />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Insert link</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="blog-link-url">URL</Label>
            <Input id="blog-link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/blog/another-article or https://…" />
            <p className="text-xs text-muted-foreground">Leave empty to remove the link.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={applyLink}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!embedOpen} onOpenChange={() => setEmbedOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {embedOpen === "video" ? "Embed video" : embedOpen === "pdf" ? "Embed PDF" : "Insert button"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="blog-embed-url">{embedOpen === "button" ? "Link target" : "URL"}</Label>
              <Input id="blog-embed-url" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder={embedOpen === "video" ? "https://youtube.com/watch?v=…" : "https://…"} />
            </div>
            {embedOpen !== "video" && (
              <div className="space-y-2">
                <Label htmlFor="blog-embed-label">Label</Label>
                <Input id="blog-embed-label" value={embedLabel} onChange={(e) => setEmbedLabel(e.target.value)} placeholder={embedOpen === "pdf" ? "Open PDF document" : "Book an appointment"} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedOpen(null)}>Cancel</Button>
            <Button onClick={applyEmbed}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Sep = () => <Separator orientation="vertical" className="mx-1 h-6" />;

function TB({
  icon: Icon, label, onClick, active,
}: {
  editor: Editor; icon: any; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle size="sm" pressed={!!active} onPressedChange={onClick} aria-label={label} className="h-8 w-8 p-0">
          <Icon className="w-4 h-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
