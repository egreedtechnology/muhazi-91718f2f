import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  UserCircle,
  Stethoscope,
  Image as ImageIcon,
  FileText,
  Megaphone,
  Settings,
  CalendarPlus,
  UserPlus,
  Search,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PatientHit { id: string; full_name: string; phone: string }
interface AppointmentHit { id: string; appointment_date: string; appointment_time: string; patient: { full_name: string } | null }
interface MessageHit { id: string; full_name: string; subject: string }

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Calendar, label: "Appointments", path: "/admin/appointments" },
  { icon: Calendar, label: "Calendar", path: "/admin/calendar" },
  { icon: Users, label: "Patients", path: "/admin/patients" },
  { icon: MessageSquare, label: "Messages", path: "/admin/messages" },
  { icon: UserCircle, label: "Staff", path: "/admin/staff" },
  { icon: Stethoscope, label: "Services", path: "/admin/services" },
  { icon: ImageIcon, label: "Gallery", path: "/admin/gallery" },
  { icon: FileText, label: "Blog", path: "/admin/blog" },
  { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientHit[]>([]);
  const [appts, setAppts] = useState<AppointmentHit[]>([]);
  const [messages, setMessages] = useState<MessageHit[]>([]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setPatients([]); setAppts([]); setMessages([]);
        return;
      }
      const [p, a, m] = await Promise.all([
        supabase.from("patients").select("id, full_name, phone").or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(6),
        supabase.from("appointments").select("id, appointment_date, appointment_time, patient:patients(full_name)").order("appointment_date", { ascending: false }).limit(20),
        supabase.from("messages").select("id, full_name, subject").or(`full_name.ilike.%${q}%,subject.ilike.%${q}%`).limit(5),
      ]);
      setPatients((p.data as PatientHit[]) || []);
      const filteredA = ((a.data as AppointmentHit[]) || []).filter(
        (x) => x.patient?.full_name?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5);
      setAppts(filteredA);
      setMessages((m.data as MessageHit[]) || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const go = (path: string) => { onOpenChange(false); setQuery(""); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search patients, appointments, messages… or jump to a page"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Search className="w-5 h-5" />
            <span className="text-sm">Type at least 2 characters</span>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/admin/appointments")}>
            <CalendarPlus className="mr-2 h-4 w-4 text-primary" />
            <span>New appointment</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/patients")}>
            <UserPlus className="mr-2 h-4 w-4 text-secondary" />
            <span>Register patient</span>
          </CommandItem>
        </CommandGroup>

        {patients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Patients">
              {patients.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/admin/patients?focus=${p.id}`)}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>{p.full_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">{p.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {appts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Appointments">
              {appts.map((a) => (
                <CommandItem key={a.id} onSelect={() => go(`/admin/appointments?focus=${a.id}`)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{a.patient?.full_name ?? "Patient"}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {a.appointment_date} · {a.appointment_time?.slice(0, 5)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {messages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Messages">
              {messages.map((m) => (
                <CommandItem key={m.id} onSelect={() => go(`/admin/messages?focus=${m.id}`)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{m.full_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-[40%]">{m.subject}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {navItems.map((n) => (
            <CommandItem key={n.path} onSelect={() => go(n.path)}>
              <n.icon className="mr-2 h-4 w-4" />
              <span>{n.label}</span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{n.path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
