import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AppointmentOption {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service: { name: string } | null;
}

interface PatientMessage {
  id: string;
  appointment_id: string | null;
  sender_role: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  patientAccountId: string;
  appointments: AppointmentOption[];
}

export function PatientInbox({ patientAccountId, appointments }: Props) {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [appointmentId, setAppointmentId] = useState<string>("none");
  const { toast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("patient_messages")
      .select("id, appointment_id, sender_role, subject, body, is_read, created_at")
      .eq("patient_account_id", patientAccountId)
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);

    const unreadFromStaff = (data || []).filter((m) => m.sender_role === "staff" && !m.is_read);
    if (unreadFromStaff.length) {
      await supabase
        .from("patient_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", unreadFromStaff.map((m) => m.id));
    }
  }, [patientAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`patient_messages_${patientAccountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_messages",
          filter: `patient_account_id=eq.${patientAccountId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientAccountId, load]);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast({ title: "Message required", description: "Please write your message.", variant: "destructive" });
      return;
    }
    if (trimmed.length > 2000) {
      toast({ title: "Message too long", description: "Keep it under 2000 characters.", variant: "destructive" });
      return;
    }

    setSending(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("patient_messages").insert({
      patient_account_id: patientAccountId,
      appointment_id: appointmentId === "none" ? null : appointmentId,
      sender_role: "patient",
      sender_user_id: auth.user?.id,
      subject: subject.trim().slice(0, 200) || null,
      body: trimmed,
    });
    setSending(false);

    if (error) {
      toast({ title: "Not sent", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message sent", description: "The clinic will reply here." });
      setSubject("");
      setBody("");
      setAppointmentId("none");
      load();
    }
  };

  const labelFor = (id: string | null) => {
    if (!id) return null;
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return null;
    return `${apt.service?.name || "Appointment"} · ${format(parseISO(apt.appointment_date), "MMM d, yyyy")}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="w-5 h-5 text-primary" /> New message
          </CardTitle>
          <CardDescription>
            Ask about an appointment or your treatment. For emergencies, please call the clinic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Subject (optional)</Label>
              <Input
                value={subject}
                maxLength={200}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Question about my filling"
              />
            </div>
            <div>
              <Label>Related appointment (optional)</Label>
              <Select value={appointmentId} onValueChange={setAppointmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not related to an appointment</SelectItem>
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.service?.name || "Appointment"} ·{" "}
                      {format(parseISO(a.appointment_date), "MMM d, yyyy")} {a.appointment_time.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              rows={4}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message to the clinic..."
            />
            <p className="text-xs text-muted-foreground mt-1">{body.length}/2000</p>
          </div>
          <Button onClick={send} disabled={sending}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : "Send message"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No messages yet. Start a conversation above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const fromClinic = m.sender_role === "staff";
            return (
              <Card
                key={m.id}
                className={fromClinic ? "border-primary/30 bg-primary/5" : ""}
              >
                <CardContent className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={fromClinic ? "default" : "secondary"}>
                        {fromClinic ? "Clinic" : "You"}
                      </Badge>
                      {m.subject && <span className="font-medium text-sm">{m.subject}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(m.created_at), "MMM d, yyyy · HH:mm")}
                    </span>
                  </div>
                  {labelFor(m.appointment_id) && (
                    <Badge variant="outline" className="text-xs">{labelFor(m.appointment_id)}</Badge>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
