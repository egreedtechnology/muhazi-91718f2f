// SEO helpers for auto-generating slugs, excerpts, and meta tags from post content.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildExcerpt(content: string, maxLen = 160): string {
  const plain = stripHtml(content);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
}

export function buildMetaTitle(title: string, maxLen = 60): string {
  const suffix = " | Muhazi Dental Clinic";
  const room = maxLen - suffix.length;
  if (title.length <= room) return `${title}${suffix}`;
  return `${title.slice(0, room - 1)}…${suffix}`;
}

export function buildKeywords(title: string, content: string, category?: string): string {
  const base = ["dental clinic", "dentist", "Rwamagana", "Rwanda", "oral health"];
  const text = `${title} ${stripHtml(content)}`.toLowerCase();
  const stop = new Set([
    "the","a","an","and","or","but","of","to","in","for","on","with","is","are",
    "was","were","be","by","at","this","that","it","as","from","you","your","we",
    "our","their","they","i","he","she","his","her","them","not","have","has","had",
    "will","can","do","does","did","also","more","than","then","so","if","into","over"
  ]);
  const freq = new Map<string, number>();
  for (const w of text.match(/[a-z]{4,}/g) || []) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const all = [...new Set([...(category ? [category] : []), ...top, ...base])];
  return all.slice(0, 12).join(", ");
}
