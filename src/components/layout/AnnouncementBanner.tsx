import { useEffect, useState } from "react";
import { X, Megaphone, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  variant: string;
}

const variantStyles: Record<string, string> = {
  info: "bg-primary text-primary-foreground",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-amber-950",
  promo: "bg-secondary text-secondary-foreground",
};

const variantIcons: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  promo: Megaphone,
};

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissed_announcements") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("announcements")
        .select("id, title, message, link_url, variant")
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(3);
      setItems((data as Announcement[]) || []);
    })();
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
  };

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="w-full">
      {visible.map((a) => {
        const Icon = variantIcons[a.variant] || Megaphone;
        return (
          <div
            key={a.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2 text-sm",
              variantStyles[a.variant] || variantStyles.info
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}:</span>{" "}
              <span className="opacity-95">{a.message}</span>
              {a.link_url && (
                <Link
                  to={a.link_url}
                  className="ml-2 underline underline-offset-2 font-medium"
                >
                  Learn more
                </Link>
              )}
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="shrink-0 opacity-80 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
