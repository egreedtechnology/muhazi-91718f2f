import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppRole, ROLE_OPTIONS } from "@/lib/rolePermissions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited: () => void;
}

const DEPARTMENTS = [
  "Clinical",
  "Administration",
  "Reception",
  "Finance",
  "IT",
  "Laboratory",
  "Pharmacy",
  "Facilities",
  "Security",
];

export function InviteStaffDialog({ open, onOpenChange, onInvited }: Props) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "Clinical",
    position: "",
    role: "dentist" as AppRole,
  });
  const [submitting, setSubmitting] = useState(false);

  const reset = () =>
    setForm({
      full_name: "",
      email: "",
      phone: "",
      department: "Clinical",
      position: "",
      role: "dentist",
    });

  const submit = async () => {
    if (!form.full_name || !form.email) {
      toast.error("Full name and email are required");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("staff-admin", {
      body: {
        action: "invite_staff",
        payload: {
          ...form,
          redirectTo: `${window.location.origin}/set-password`,
        },
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast.error(error?.message ?? data?.error ?? "Failed to invite");
      return;
    }
    toast.success(`Invitation sent to ${form.email}`);
    reset();
    onOpenChange(false);
    onInvited();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Staff</DialogTitle>
          <DialogDescription>
            Create an account and send a password-setup email. The account starts
            as <strong>Pending</strong> until they sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Jane Uwase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@muhazidentalclinic.org"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+250 78 000 0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={form.department}
                onValueChange={(v) => setForm({ ...form, department: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Senior Dentist"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as AppRole })}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
