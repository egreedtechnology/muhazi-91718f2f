import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, Search } from "lucide-react";
import {
  AppRole,
  ROLE_LABELS,
  ROLE_OPTIONS,
  ROLE_PERMISSIONS,
} from "@/lib/rolePermissions";

interface Seed {
  user_id: string;
  full_name: string;
  email: string | null;
}
interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seed: Seed | null;
  onAssigned: () => void;
}

interface SearchResult {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  roles: AppRole[];
}

export function AssignRoleDialog({
  open,
  onOpenChange,
  seed,
  onAssigned,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [role, setRole] = useState<AppRole>("dentist");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setRole("dentist");
      return;
    }
    if (seed) {
      setSelected({
        user_id: seed.user_id,
        full_name: seed.full_name,
        email: seed.email,
        phone: null,
        avatar_url: null,
        roles: [],
      });
    }
  }, [open, seed]);

  useEffect(() => {
    if (!open || selected) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase.functions.invoke("staff-admin", {
        body: { action: "search_users", payload: { query } },
      });
      setSearching(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setResults(data?.results ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, selected]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("staff-admin", {
      body: {
        action: "assign_role",
        payload: { user_id: selected.user_id, role },
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast.error(error?.message ?? data?.error ?? "Failed to assign role");
      return;
    }
    toast.success(`${ROLE_LABELS[role]} role assigned to ${selected.full_name}`);
    onOpenChange(false);
    onAssigned();
  };

  const initials = (n: string) =>
    n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Search a staff account and assign a role. No UUIDs required.
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by name, email, or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
              {searching ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No accounts found.
                </p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.user_id}
                    onClick={() => setSelected(r)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials(r.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {r.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.email}
                      </p>
                    </div>
                    {r.roles[0] && (
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[r.roles[0]]}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {selected.avatar_url && (
                  <AvatarImage src={selected.avatar_url} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(selected.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selected.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg border bg-background">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Permissions preview
              </p>
              <ul className="space-y-1.5">
                {ROLE_PERMISSIONS[role].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
