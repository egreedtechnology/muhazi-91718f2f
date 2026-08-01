import { useState, useEffect } from "react";
import { Plus, Search, Calendar, Clock, User, Trash2, Pencil, CheckCircle, XCircle, Filter, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  duration_minutes: number;
  patient_id: string;
  service_id: string | null;
  staff_id: string | null;
  patient?: { id: string; full_name: string; phone: string; email: string | null };
  service?: { id: string; name: string; duration_minutes: number };
  staff?: { id: string; full_name: string; specialization: string | null };
}

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Staff {
  id: string;
  full_name: string;
  specialization: string | null;
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Appointment | null>(null);
  const [deleteItem, setDeleteItem] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    patient_id: "",
    service_id: "",
    staff_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "09:00",
    duration_minutes: 30,
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [appointmentsRes, patientsRes, servicesRes, staffRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(`*, patient:patients(id, full_name, phone, email), service:services(id, name, duration_minutes), staff:staff(id, full_name, specialization)`)
        .is("archived_at", null)
        .order("appointment_date", { ascending: false }),
      supabase.from("patients").select("id, full_name, phone, email").is("archived_at", null).order("full_name"),
      supabase.from("services").select("id, name, duration_minutes").eq("is_active", true),
      supabase.from("staff").select("id, full_name, specialization").eq("is_active", true),
    ]);

    if (!appointmentsRes.error) setAppointments(appointmentsRes.data as unknown as Appointment[]);
    if (!patientsRes.error) setPatients(patientsRes.data || []);
    if (!servicesRes.error) setServices(servicesRes.data || []);
    if (!staffRes.error) setStaffList(staffRes.data || []);
    
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    const payload = {
      patient_id: formData.patient_id,
      service_id: formData.service_id || null,
      staff_id: formData.staff_id || null,
      appointment_date: formData.appointment_date,
      appointment_time: formData.appointment_time,
      duration_minutes: formData.duration_minutes,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (editingItem) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", editingItem.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update appointment", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Appointment updated" });
        fetchData();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("appointments").insert(payload);
      if (error) {
        toast({ title: "Error", description: "Failed to create appointment", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Appointment created" });
        fetchData();
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from("appointments").delete().eq("id", deleteItem.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete appointment", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Appointment removed" });
      fetchData();
    }
    setDeleteItem(null);
  };

  const handleEdit = (item: Appointment) => {
    setEditingItem(item);
    setFormData({
      patient_id: item.patient_id,
      service_id: item.service_id || "",
      staff_id: item.staff_id || "",
      appointment_date: item.appointment_date,
      appointment_time: item.appointment_time,
      duration_minutes: item.duration_minutes,
      status: item.status,
      notes: item.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      patient_id: "",
      service_id: "",
      staff_id: "",
      appointment_date: format(new Date(), "yyyy-MM-dd"),
      appointment_time: "09:00",
      duration_minutes: 30,
      status: "pending",
      notes: "",
    });
    setIsDialogOpen(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Confirmed</Badge>;
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case "completed": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Completed</Badge>;
      case "cancelled": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = dateFrom || dateTo || timeFrom || timeTo || statusFilter !== "all" || searchQuery;

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch = a.patient?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.service?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const appointmentDate = parseISO(a.appointment_date);
      if (dateFrom && dateTo) {
        matchesDateRange = isWithinInterval(appointmentDate, {
          start: startOfDay(parseISO(dateFrom)),
          end: endOfDay(parseISO(dateTo)),
        });
      } else if (dateFrom) {
        matchesDateRange = appointmentDate >= startOfDay(parseISO(dateFrom));
      } else if (dateTo) {
        matchesDateRange = appointmentDate <= endOfDay(parseISO(dateTo));
      }
    }
    
    // Time range filter
    let matchesTimeRange = true;
    if (timeFrom || timeTo) {
      const appointmentTime = a.appointment_time.slice(0, 5);
      if (timeFrom && appointmentTime < timeFrom) matchesTimeRange = false;
      if (timeTo && appointmentTime > timeTo) matchesTimeRange = false;
    }
    
    return matchesSearch && matchesStatus && matchesDateRange && matchesTimeRange;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Manage all clinic appointments</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Appointment
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="space-y-4">
              {/* Main search and filter toggle */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant={showFilters ? "secondary" : "outline"} 
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                      Active
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Expandable filters */}
              {showFilters && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Date From */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Date From</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Date To */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Date To</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Time From */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Time From</Label>
                      <Input
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Time To */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Time To</Label>
                      <Input
                        type="time"
                        value={timeTo}
                        onChange={(e) => setTimeTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Status */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {statusOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Filter actions */}
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredAppointments.length} of {appointments.length} appointments
                    </p>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                        <X className="w-3 h-3" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No appointments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="font-medium">{format(new Date(appointment.appointment_date), "MMM d, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">{appointment.appointment_time.slice(0, 5)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{appointment.patient?.full_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{appointment.patient?.phone}</div>
                          {appointment.patient?.email && (
                            <div className="text-xs text-muted-foreground">{appointment.patient.email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{appointment.service?.name || "-"}</div>
                          {appointment.service?.duration_minutes && (
                            <div className="text-xs text-muted-foreground">{appointment.service.duration_minutes} min</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{appointment.staff?.full_name || "Unassigned"}</div>
                          {appointment.staff?.specialization && (
                            <div className="text-xs text-muted-foreground">{appointment.staff.specialization}</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {appointment.status === "pending" && (
                              <>
                                <Button variant="ghost" size="icon" className="text-green-600" onClick={() => updateStatus(appointment.id, "confirmed")}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => updateStatus(appointment.id, "cancelled")}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(appointment)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(appointment)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Appointment" : "New Appointment"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(v) => setFormData((p) => ({ ...p, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name} - {p.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={formData.appointment_date} onChange={(e) => setFormData((p) => ({ ...p, appointment_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input type="time" value={formData.appointment_time} onChange={(e) => setFormData((p) => ({ ...p, appointment_time: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Service</Label>
                <Select value={formData.service_id} onValueChange={(v) => {
                  const svc = services.find((s) => s.id === v);
                  setFormData((p) => ({ ...p, service_id: v, duration_minutes: svc?.duration_minutes || 30 }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assign Doctor</Label>
                <Select value={formData.staff_id} onValueChange={(v) => setFormData((p) => ({ ...p, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name} {s.specialization && `- ${s.specialization}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" rows={2} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">{editingItem ? "Save Changes" : "Create Appointment"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove this appointment.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
