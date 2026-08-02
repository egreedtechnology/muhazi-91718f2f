import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Props {
  patientAccountId: string;
  hasEmail: boolean;
}

interface Prefs {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  appointment_reminders: boolean;
  appointment_updates: boolean;
  treatment_updates: boolean;
  reminder_hours_before: number;
}

const defaults: Prefs = {
  email_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: false,
  appointment_reminders: true,
  appointment_updates: true,
  treatment_updates: true,
  reminder_hours_before: 24,
};

export function NotificationSettings({ patientAccountId, hasEmail }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("patient_notification_preferences")
        .select(
          "email_enabled, sms_enabled, whatsapp_enabled, appointment_reminders, appointment_updates, treatment_updates, reminder_hours_before"
        )
        .eq("patient_account_id", patientAccountId)
        .maybeSingle();
      if (active) {
        if (data) setPrefs(data as Prefs);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientAccountId]);

  const update = (key: keyof Prefs, value: boolean | number) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patient_notification_preferences")
      .upsert(
        { patient_account_id: patientAccountId, ...prefs },
        { onConflict: "patient_account_id" }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferences saved", description: "Your notification settings are updated." });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const channels: { key: keyof Prefs; label: string; hint: string }[] = [
    { key: "whatsapp_enabled", label: "WhatsApp", hint: "Reminders on your WhatsApp number" },
    { key: "sms_enabled", label: "SMS", hint: "Text messages to your phone" },
    {
      key: "email_enabled",
      label: "Email",
      hint: hasEmail ? "Sent to your email on file" : "Add an email at reception to enable",
    },
  ];

  const types: { key: keyof Prefs; label: string; hint: string }[] = [
    { key: "appointment_reminders", label: "Appointment reminders", hint: "Before your visit" },
    { key: "appointment_updates", label: "Appointment updates", hint: "Confirmations, reschedules, cancellations" },
    { key: "treatment_updates", label: "Treatment updates", hint: "New records and follow-up notes" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bell className="w-5 h-5 text-primary" /> Notification settings
        </CardTitle>
        <CardDescription>Choose how the clinic reaches you about your care.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm font-medium">Channels</p>
          {channels.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={c.key}>{c.label}</Label>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </div>
              <Switch
                id={c.key}
                checked={Boolean(prefs[c.key])}
                disabled={c.key === "email_enabled" && !hasEmail}
                onCheckedChange={(v) => update(c.key, v)}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          <p className="text-sm font-medium">What to notify me about</p>
          {types.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={t.key}>{t.label}</Label>
                <p className="text-xs text-muted-foreground">{t.hint}</p>
              </div>
              <Switch
                id={t.key}
                checked={Boolean(prefs[t.key])}
                onCheckedChange={(v) => update(t.key, v)}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Remind me</Label>
          <Select
            value={String(prefs.reminder_hours_before)}
            onValueChange={(v) => update("reminder_hours_before", Number(v))}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 hours before</SelectItem>
              <SelectItem value="6">6 hours before</SelectItem>
              <SelectItem value="24">1 day before</SelectItem>
              <SelectItem value="48">2 days before</SelectItem>
              <SelectItem value="72">3 days before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
