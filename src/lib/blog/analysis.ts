// Blog-only helpers: reading time, readability, SEO scoring, TOC, internal links.
// Additive module — nothing else in the app imports or depends on this.

import { stripHtml } from "@/lib/seo";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export function headingId(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return base ? `${base}-${index}` : `section-${index}`;
}

/** Extracts h2/h3 headings and returns the html with stable ids injected. */
export function withHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  let i = 0;
  const out = html.replace(
    /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (_m, lvl: string, attrs: string | undefined, inner: string) => {
      const text = stripHtml(inner);
      const id = headingId(text, i++);
      headings.push({ id, text, level: Number(lvl) });
      const cleaned = (attrs || "").replace(/\sid="[^"]*"/i, "");
      return `<h${lvl}${cleaned} id="${id}">${inner}</h${lvl}>`;
    },
  );
  return { html: out, headings };
}

export function wordCount(content: string): number {
  const plain = stripHtml(content);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(wordCount(content) / 200));
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

export interface Readability {
  score: number; // 0-100, higher = easier
  label: string;
  words: number;
  sentences: number;
  avgSentenceLength: number;
}

/** Flesch Reading Ease, clamped to 0-100. */
export function readability(content: string): Readability {
  const plain = stripHtml(content);
  const words = plain.split(/\s+/).filter(Boolean);
  const sentences = plain.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const nW = words.length;
  const nS = Math.max(1, sentences.length);
  const nSy = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (nW === 0) {
    return { score: 0, label: "No content", words: 0, sentences: 0, avgSentenceLength: 0 };
  }

  const raw = 206.835 - 1.015 * (nW / nS) - 84.6 * (nSy / nW);
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  let label = "Very difficult";
  if (score >= 80) label = "Very easy";
  else if (score >= 70) label = "Easy";
  else if (score >= 60) label = "Plain English";
  else if (score >= 50) label = "Fairly difficult";
  else if (score >= 30) label = "Difficult";

  return {
    score,
    label,
    words: nW,
    sentences: nS,
    avgSentenceLength: Math.round((nW / nS) * 10) / 10,
  };
}

export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

export interface SeoAudit {
  score: number;
  checks: SeoCheck[];
}

export function auditSeo(input: {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  coverImageUrl: string;
  coverImageAlt: string;
  tags: string[];
}): SeoAudit {
  const plain = stripHtml(input.content).toLowerCase();
  const kw = input.focusKeyword.trim().toLowerCase();
  const words = wordCount(input.content);
  const headings = (input.content.match(/<h[23][\s>]/gi) || []).length;
  const links = (input.content.match(/<a\s[^>]*href=/gi) || []).length;
  const images = (input.content.match(/<img\s/gi) || []).length;
  const imagesWithAlt = (input.content.match(/<img[^>]*\salt="[^"]+"/gi) || []).length;

  const kwCount = kw ? (plain.match(new RegExp(escapeRegex(kw), "g")) || []).length : 0;
  const density = words ? (kwCount / words) * 100 : 0;

  const checks: SeoCheck[] = [
    {
      id: "focus",
      label: "Focus keyword set",
      passed: kw.length > 2,
      hint: "Pick one main phrase patients would search for, e.g. “tooth extraction aftercare”.",
    },
    {
      id: "kw-title",
      label: "Focus keyword in title",
      passed: !!kw && input.title.toLowerCase().includes(kw),
      hint: "Include the focus keyword in the article title.",
    },
    {
      id: "kw-slug",
      label: "Focus keyword in URL slug",
      passed: !!kw && input.slug.includes(kw.replace(/\s+/g, "-")),
      hint: "Use the keyword in the URL, separated by hyphens.",
    },
    {
      id: "kw-intro",
      label: "Focus keyword in first paragraph",
      passed: !!kw && plain.slice(0, 400).includes(kw),
      hint: "Mention the keyword naturally within the opening lines.",
    },
    {
      id: "density",
      label: "Keyword density 0.5%–2.5%",
      passed: density >= 0.5 && density <= 2.5,
      hint: `Current density ${density.toFixed(2)}%. Aim for natural usage, not stuffing.`,
    },
    {
      id: "meta-title",
      label: "Meta title 30–60 characters",
      passed: input.metaTitle.length >= 30 && input.metaTitle.length <= 60,
      hint: `Currently ${input.metaTitle.length} characters.`,
    },
    {
      id: "meta-desc",
      label: "Meta description 70–160 characters",
      passed: input.metaDescription.length >= 70 && input.metaDescription.length <= 160,
      hint: `Currently ${input.metaDescription.length} characters.`,
    },
    {
      id: "length",
      label: "At least 600 words",
      passed: words >= 600,
      hint: `Currently ${words} words. Longer, thorough medical guides rank better.`,
    },
    {
      id: "headings",
      label: "Uses subheadings",
      passed: headings >= 2,
      hint: "Break the article into H2/H3 sections such as Symptoms, Treatment, Prevention.",
    },
    {
      id: "links",
      label: "Contains at least one link",
      passed: links >= 1,
      hint: "Link to a related article or your booking page.",
    },
    {
      id: "cover",
      label: "Cover image with alt text",
      passed: !!input.coverImageUrl && input.coverImageAlt.trim().length > 3,
      hint: "Add a featured image and describe it for screen readers and image search.",
    },
    {
      id: "img-alt",
      label: "All in-article images have alt text",
      passed: images === 0 || images === imagesWithAlt,
      hint: `${images - imagesWithAlt} image(s) are missing alt text.`,
    },
    {
      id: "tags",
      label: "At least two tags",
      passed: input.tags.length >= 2,
      hint: "Tags help group related articles and build topical authority.",
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  return { score: Math.round((passed / checks.length) * 100), checks };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface LinkSuggestion {
  title: string;
  slug: string;
  matchedOn: string;
}

/** Suggests internal links by matching other posts' titles/keywords against this content. */
export function suggestInternalLinks(
  content: string,
  others: { title: string; slug: string; focus_keyword?: string | null }[],
): LinkSuggestion[] {
  const plain = stripHtml(content).toLowerCase();
  const alreadyLinked = new Set(
    (content.match(/href="\/blog\/([^"]+)"/g) || []).map((m) => m.replace(/.*\/blog\//, "").replace(/"$/, "")),
  );

  const out: LinkSuggestion[] = [];
  for (const o of others) {
    if (alreadyLinked.has(o.slug)) continue;
    const candidates = [o.focus_keyword || "", o.title].filter((c) => c.trim().length > 3);
    const hit = candidates.find((c) => plain.includes(c.toLowerCase()));
    if (hit) out.push({ title: o.title, slug: o.slug, matchedOn: hit });
  }
  return out.slice(0, 6);
}
