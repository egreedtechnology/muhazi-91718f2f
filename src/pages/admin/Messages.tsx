import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Mail,
  MailOpen,
  Phone,
  Trash2,
  Eye,
  MessageSquare,
  RefreshCw,
  Copy,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

const REPLY_TEMPLATES: { id: string; label: string; body: (m: Message) => string }[] = [
  {
    id: "ack",
    label: "Acknowledge",
    body: (m) =>
      `Hello ${m.full_name.split(" ")[0]},\n\nThank you for reaching out to Muhazi Dental Clinic. We have received your message regarding "${m.subject}" and a member of our team will get back to you within a few hours.\n\nWarm regards,\nMuhazi Dental Clinic`,
  },
  {
    id: "book",
    label: "Invite to book",
    body: (m) =>
      `Hello ${m.full_name.split(" ")[0]},\n\nThank you for contacting Muhazi Dental Clinic. To schedule your visit you can book online at https://muhazidentalclinic.org/book or call us at +250 787 630 399.\n\nWe look forward to caring for your smile.\n\nMuhazi Dental Clinic`,
  },
  {
    id: "confirm",
    label: "Confirm appointment",
    body: (m) =>
      `Hello ${m.full_name.split(" ")[0]},\n\nYour appointment at Muhazi Dental Clinic is confirmed. Please arrive 10 minutes early and bring any prior dental records.\n\nAddress: 2nd Floor, above MTN Branch, Rwamagana.\nIf you need to reschedule, reply to this message or call +250 787 630 399.\n\nMuhazi Dental Clinic`,
  },
  {
    id: "info",
    label: "Hours & location",
    body: () =>
      `We are open every day from 8:00 AM to 8:00 PM at the 2nd Floor, above MTN Branch in Rwamagana.\nPhone: +250 787 630 399\nWebsite: https://muhazidentalclinic.org\n\nMuhazi Dental Clinic`,
  },
];

export default function Messages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch messages", variant: "destructive" });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const setReadFlag = async (id: string, read: boolean) => {
    const payload = read
      ? { is_read: true, read_at: new Date().toISOString() }
      : { is_read: false, read_at: null };
    const { error } = await supabase.from("messages").update(payload).eq("id", id);
    if (!error) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...payload } as Message : m)));
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, ...(payload as any) });
      }
    }
  };

  const handleViewMessage = async (message: Message) => {
    setSelectedMessage(message);
    setReply("");
    setViewDialogOpen(true);
    if (!message.is_read) await setReadFlag(message.id, true);
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    const { error } = await supabase.from("messages").delete().eq("id", messageToDelete);
    if (error) {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Message removed." });
      setMessages(messages.filter((m) => m.id !== messageToDelete));
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const applyTemplate = (id: string) => {
    if (!selectedMessage) return;
    const tpl = REPLY_TEMPLATES.find((t) => t.id === id);
    if (tpl) setReply(tpl.body(selectedMessage));
  };

  const copyReply = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
    toast({ title: "Copied", description: "Reply copied to clipboard." });
  };

  const sendEmail = () => {
    if (!selectedMessage?.email) return;
    const subject = encodeURIComponent(`Re: ${selectedMessage.subject}`);
    const body = encodeURIComponent(reply || "");
    window.location.href = `mailto:${selectedMessage.email}?subject=${subject}&body=${body}`;
  };

  const sendWhatsApp = () => {
    if (!selectedMessage) return;
    const phone = selectedMessage.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(reply || "");
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.phone.includes(searchQuery) ||
      (message.email && message.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "unread" && !message.is_read) ||
      (filterStatus === "read" && message.is_read);
    return matchesSearch && matchesStatus;
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Inbox</h1>
            <p className="text-muted-foreground">Appointment requests and contact messages</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} unread
              </Badge>
            )}
            <Button variant="outline" size="icon" onClick={fetchMessages}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  All ({messages.length})
                </Button>
                <Button
                  variant={filterStatus === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("unread")}
                >
                  Unread ({unreadCount})
                </Button>
                <Button
                  variant={filterStatus === "read" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("read")}
                >
                  Read ({messages.length - unreadCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              All Messages ({filteredMessages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id} className={!message.is_read ? "bg-primary/5" : ""}>
                      <TableCell>
                        <button
                          onClick={() => setReadFlag(message.id, !message.is_read)}
                          title={message.is_read ? "Mark as unread" : "Mark as read"}
                          className="hover:text-primary"
                        >
                          {message.is_read ? (
                            <MailOpen className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Mail className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className={!message.is_read ? "font-semibold" : ""}>{message.full_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`max-w-[200px] truncate ${!message.is_read ? "font-semibold" : ""}`}>
                          {message.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${message.phone}`} className="hover:text-primary">
                              {message.phone}
                            </a>
                          </div>
                          {message.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <a href={`mailto:${message.email}`} className="hover:text-primary">
                                {message.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(message.created_at), "MMM d, yyyy")}
                          <br />
                          {format(new Date(message.created_at), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewMessage(message)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setMessageToDelete(message.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View + reply dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</label>
                  <p className="font-medium">{selectedMessage.full_name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</label>
                  <p>{format(new Date(selectedMessage.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                  <p>
                    <a href={`tel:${selectedMessage.phone}`} className="text-primary hover:underline">
                      {selectedMessage.phone}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <p>
                    {selectedMessage.email ? (
                      <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">
                        {selectedMessage.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
                <p className="font-medium">{selectedMessage.subject}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</label>
                <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Templates */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Reply templates
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReadFlag(selectedMessage.id, !selectedMessage.is_read)}
                  >
                    {selectedMessage.is_read ? (
                      <><Mail className="w-3.5 h-3.5 mr-1" /> Mark unread</>
                    ) : (
                      <><MailOpen className="w-3.5 h-3.5 mr-1" /> Mark read</>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {REPLY_TEMPLATES.map((t) => (
                    <Button key={t.id} size="sm" variant="outline" onClick={() => applyTemplate(t.id)}>
                      {t.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply or pick a template above…"
                  rows={6}
                />
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button onClick={sendEmail} disabled={!selectedMessage.email || !reply} className="flex-1 min-w-[140px]">
                    <Send className="w-4 h-4 mr-2" /> Email reply
                  </Button>
                  <Button onClick={sendWhatsApp} variant="secondary" disabled={!reply} className="flex-1 min-w-[140px]">
                    <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button onClick={copyReply} variant="outline" disabled={!reply}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`tel:${selectedMessage.phone}`}>
                      <Phone className="w-4 h-4 mr-2" /> Call
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
