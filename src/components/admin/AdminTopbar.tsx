import { useEffect, useState } from "react";
import { Search, Bell, CalendarPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface AdminTopbarProps {
  onOpenCommand: () => void;
}

export function AdminTopbar({ onOpenCommand }: AdminTopbarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-6 gap-3">
      {/* Status pill */}
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Live
      </div>

      {/* Search trigger */}
      <button
        onClick={onOpenCommand}
        className="flex-1 max-w-xl flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search patients, appointments, pages…</span>
        <span className="hidden sm:flex items-center gap-1">
          <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      {/* Clock */}
      <div className="hidden lg:flex flex-col text-right leading-tight">
        <span className="font-mono text-sm font-semibold text-foreground">
          {format(now, "HH:mm")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {format(now, "EEE, dd MMM")}
        </span>
      </div>

      {/* Quick actions */}
      <div className="hidden sm:flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild title="New patient">
          <Link to="/admin/patients"><UserPlus className="w-4 h-4" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="New appointment">
          <Link to="/admin/appointments"><CalendarPlus className="w-4 h-4" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Messages">
          <Link to="/admin/messages" className="relative">
            <Bell className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
