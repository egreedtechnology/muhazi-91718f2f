import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, FileText, User, Phone, Mail, LogOut, RefreshCw, CalendarPlus, Stethoscope, MessageSquare, CalendarClock } from "lucide-react";
import { PatientInbox } from "@/components/patient/PatientInbox";
import { NotificationSettings } from "@/components/patient/NotificationSettings";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

interface PatientAccount {
  id: string;
  patient_id: string;
  patient: {
    full_name: string;
    phone: string;
    email: string | null;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service: { name: string } | null;
  staff: { full_name: string } | null;
}

interface TreatmentRecord {
  id: string;
  treatment_date: string;
  diagnosis: string | null;
  treatment_notes: string | null;
  procedures_performed: string[] | null;
  treated_by: { full_name: string } | null;
}

interface AppointmentRequest {
  id: string;
  appointment_id: string;
  request_type: string;
  requested_date: string | null;
  requested_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
}

const statusStyles: Record<string, string> = {
  pending: "bg-secondary/15 text-secondary border-secondary/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  rescheduled: "bg-accent/20 text-accent-foreground border-accent/40",
};

const PatientPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [patientAccount, setPatientAccount] = useState<PatientAccount | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [requestType, setRequestType] = useState<"reschedule" | "cancel">("reschedule");
  const [requestReason, setRequestReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsLoggedIn(true);
      await fetchPatientData(session.user.id);
    }
    setIsLoading(false);
  };

  const fetchPatientData = async (userId: string) => {
    const { data: account } = await supabase
      .from("patient_accounts")
      .select(`
        id,
        patient_id,
        patient:patients(full_name, phone, email)
      `)
      .eq("user_id", userId)
      .single();

    if (account) {
      setPatientAccount(account as any);
      await Promise.all([
        fetchAppointments(account.patient_id),
        fetchTreatmentRecords(account.patient_id),
        fetchRequests(account.id),
      ]);
    }
  };

  const fetchAppointments = async (patientId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        service:services(name),
        staff:staff(full_name)
      `)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false });

    setAppointments(data || []);
  };

  const fetchTreatmentRecords = async (patientId: string) => {
    const { data } = await supabase
      .from("treatment_records")
      .select(`
        id,
        treatment_date,
        diagnosis,
        treatment_notes,
        procedures_performed,
        treated_by:staff(full_name)
      `)
      .eq("patient_id", patientId)
      .order("treatment_date", { ascending: false });

    setTreatmentRecords(data || []);
  };

  const fetchRequests = async (accountId: string) => {
    const { data } = await supabase
      .from("appointment_requests")
      .select("id, appointment_id, request_type, requested_date, requested_time, reason, status, created_at, processed_at")
      .eq("patient_account_id", accountId)
      .order("created_at", { ascending: false });

    setRequests(data || []);
  };

  const handleRefresh = async () => {
    if (!patientAccount) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchAppointments(patientAccount.patient_id),
      fetchTreatmentRecords(patientAccount.patient_id),
      fetchRequests(patientAccount.id),
    ]);
    setIsRefreshing(false);
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/patient/login");
  };

  const handleSubmitRequest = async () => {
    if (!selectedAppointment || !patientAccount) return;
    if (requestType === "reschedule" && (!requestedDate || !requestedTime)) {
      toast({ title: "Missing details", description: "Choose a preferred date and time.", variant: "destructive" });
      return;
    }
    if (!requestReason.trim()) {
      toast({ title: "Reason required", description: "Please tell us why you need this change.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("appointment_requests").insert({
      appointment_id: selectedAppointment.id,
      patient_account_id: patientAccount.id,
      request_type: requestType,
      requested_date: requestType === "reschedule" ? requestedDate : null,
      requested_time: requestType === "reschedule" ? requestedTime : null,
      reason: requestReason,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } else {
      toast({ title: "Request sent", description: "The clinic will contact you shortly." });
      setRequestDialogOpen(false);
      setRequestReason("");
      setRequestedDate("");
      setRequestedTime("");
      handleRefresh();
    }
  };

  const today = new Date(new Date().toDateString());
  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.appointment_date) >= today && apt.status !== "cancelled")
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const pastAppointments = appointments.filter(
    apt => new Date(apt.appointment_date) < today || apt.status === "cancelled"
  );

  const nextAppointment = upcomingAppointments[0];

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="pt-32 pb-16 min-h-screen container-custom px-4 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </PublicLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <PublicLayout>
        <section className="pt-32 pb-16 min-h-screen bg-gradient-to-b from-primary/5 to-background">
          <div className="container-custom px-4">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Patient Portal</CardTitle>
                <CardDescription>
                  Sign in to view your appointments and medical records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full">
                  <Link to="/patient/login">Sign In</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/patient/register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </PublicLayout>
    );
  }

  if (!patientAccount) {
    return (
      <PublicLayout>
        <section className="pt-32 pb-16 min-h-screen bg-gradient-to-b from-primary/5 to-background">
          <div className="container-custom px-4">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Account Not Linked</CardTitle>
                <CardDescription>
                  Your account is not linked to a patient record yet. Please contact the clinic.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/contact">Contact Clinic</Link>
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                  Sign out
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="pt-32 pb-16 min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container-custom px-4">
          {/* Welcome Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome, {patientAccount.patient.full_name}
              </h1>
              <p className="text-muted-foreground">Manage your appointments and view your records</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild size="sm">
                <Link to="/book"><CalendarPlus className="w-4 h-4 mr-2" />Book</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />Sign out
              </Button>
            </div>
          </div>

          {/* Next appointment highlight */}
          {nextAppointment && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-xl bg-primary/15">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary font-medium">Your next visit</p>
                    <h2 className="text-lg font-semibold">
                      {nextAppointment.service?.name || "Dental Appointment"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(nextAppointment.appointment_date), "EEEE, MMMM d, yyyy")} at{" "}
                      {nextAppointment.appointment_time.slice(0, 5)} · {nextAppointment.staff?.full_name || "Doctor TBD"}
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-2xl font-bold text-primary">
                    {(() => {
                      const days = differenceInCalendarDays(parseISO(nextAppointment.appointment_date), today);
                      return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
                    })()}
                  </p>
                  <Badge variant="outline" className={statusStyles[nextAppointment.status]}>
                    {nextAppointment.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Calendar, value: upcomingAppointments.length, label: "Upcoming Appointments" },
              { icon: FileText, value: treatmentRecords.length, label: "Treatment Records" },
              { icon: Clock, value: pastAppointments.length, label: "Past Visits" },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="records">Medical Records</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>


            <TabsContent value="upcoming">
              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No upcoming appointments</p>
                      <Button asChild className="mt-4">
                        <Link to="/book">Book an Appointment</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingAppointments.map(apt => (
                    <Card key={apt.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="p-3 rounded-lg bg-primary/10 h-fit">
                              <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{apt.service?.name || "Dental Appointment"}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(apt.appointment_date), "EEEE, MMMM d, yyyy")} at {apt.appointment_time.slice(0, 5)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                With: {apt.staff?.full_name || "TBD"}
                              </p>
                              {apt.notes && (
                                <p className="text-sm text-muted-foreground mt-1 italic">{apt.notes}</p>
                              )}
                              <Badge variant="outline" className={`mt-2 ${statusStyles[apt.status]}`}>
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 md:flex-col">
                            <Dialog open={requestDialogOpen && selectedAppointment?.id === apt.id} onOpenChange={(open) => {
                              setRequestDialogOpen(open);
                              if (open) setSelectedAppointment(apt);
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Request Change</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Request Appointment Change</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex gap-2">
                                    <Button
                                      variant={requestType === "reschedule" ? "default" : "outline"}
                                      onClick={() => setRequestType("reschedule")}
                                      className="flex-1"
                                    >
                                      Reschedule
                                    </Button>
                                    <Button
                                      variant={requestType === "cancel" ? "destructive" : "outline"}
                                      onClick={() => setRequestType("cancel")}
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>

                                  {requestType === "reschedule" && (
                                    <>
                                      <div>
                                        <Label>Preferred Date</Label>
                                        <Input
                                          type="date"
                                          value={requestedDate}
                                          onChange={(e) => setRequestedDate(e.target.value)}
                                          min={format(new Date(), "yyyy-MM-dd")}
                                        />
                                      </div>
                                      <div>
                                        <Label>Preferred Time</Label>
                                        <Input
                                          type="time"
                                          value={requestedTime}
                                          onChange={(e) => setRequestedTime(e.target.value)}
                                        />
                                      </div>
                                    </>
                                  )}

                                  <div>
                                    <Label>Reason</Label>
                                    <Textarea
                                      value={requestReason}
                                      onChange={(e) => setRequestReason(e.target.value)}
                                      placeholder="Please provide a reason for your request..."
                                      rows={3}
                                    />
                                  </div>

                                  <Button onClick={handleSubmitRequest} className="w-full" disabled={submitting}>
                                    {submitting ? "Submitting..." : "Submit Request"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {pastAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No past appointments found.
                    </CardContent>
                  </Card>
                ) : (
                  pastAppointments.map(apt => (
                    <Card key={apt.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-semibold">{apt.service?.name || "Dental Appointment"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(apt.appointment_date), "MMMM d, yyyy")} at {apt.appointment_time.slice(0, 5)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              With: {apt.staff?.full_name || "N/A"}
                            </p>
                          </div>
                          <Badge variant="outline" className={statusStyles[apt.status]}>{apt.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="records">
              <div className="space-y-4">
                {treatmentRecords.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No medical records found.
                    </CardContent>
                  </Card>
                ) : (
                  treatmentRecords.map(record => (
                    <Card key={record.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">
                              {format(parseISO(record.treatment_date), "MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Treated by: {record.treated_by?.full_name || "N/A"}
                            </p>
                          </div>
                        </div>
                        {record.diagnosis && (
                          <div className="mb-2">
                            <p className="text-sm font-medium">Diagnosis:</p>
                            <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                          </div>
                        )}
                        {record.procedures_performed && record.procedures_performed.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm font-medium">Procedures:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {record.procedures_performed.map((proc, idx) => (
                                <Badge key={idx} variant="secondary">{proc}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {record.treatment_notes && (
                          <div>
                            <p className="text-sm font-medium">Notes:</p>
                            <p className="text-sm text-muted-foreground">{record.treatment_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CalendarClock className="w-5 h-5 text-primary" /> Reschedule & cancellation requests
                    </CardTitle>
                    <CardDescription>
                      Use "Request Change" on an upcoming appointment to ask for a new date or time. Track the clinic's response here.
                    </CardDescription>
                  </CardHeader>
                </Card>

                {requests.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      You haven't submitted any requests yet.
                    </CardContent>
                  </Card>
                ) : (
                  requests.map((req) => {
                    const apt = appointments.find((a) => a.id === req.appointment_id);
                    return (
                      <Card key={req.id}>
                        <CardContent className="py-4 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold capitalize">
                                {req.request_type === "cancel" ? "Cancellation request" : "Reschedule request"}
                              </h3>
                              {apt && (
                                <p className="text-sm text-muted-foreground">
                                  Original: {format(parseISO(apt.appointment_date), "MMMM d, yyyy")} at {apt.appointment_time.slice(0, 5)}
                                </p>
                              )}
                              {req.requested_date && (
                                <p className="text-sm text-muted-foreground">
                                  Requested: {format(parseISO(req.requested_date), "MMMM d, yyyy")}
                                  {req.requested_time ? ` at ${req.requested_time.slice(0, 5)}` : ""}
                                </p>
                              )}
                              {req.reason && (
                                <p className="text-sm text-muted-foreground italic mt-1">"{req.reason}"</p>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant="outline" className={requestStatusStyles[req.status] || ""}>
                                {req.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Sent {format(parseISO(req.created_at), "MMM d, yyyy")}
                              </p>
                              {req.processed_at && (
                                <p className="text-xs text-muted-foreground">
                                  Answered {format(parseISO(req.processed_at), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages">
              <PatientInbox patientAccountId={patientAccount.id} appointments={appointments} />
            </TabsContent>

            <TabsContent value="profile">
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">My details</CardTitle>
                  <CardDescription>
                    To update your details, please contact the clinic reception.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm">{patientAccount.patient.full_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm">{patientAccount.patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm">{patientAccount.patient.email || "No email on file"}</span>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/contact">Contact clinic</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />Sign out
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <NotificationSettings
                patientAccountId={patientAccount.id}
                hasEmail={Boolean(patientAccount.patient.email)}
              />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </section>
    </PublicLayout>
  );
};

export default PatientPortal;
