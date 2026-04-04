import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  CheckCircle2,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import BookingGuide from "@/components/booking/BookingGuide";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const services = [
  { id: "general", name: "General Checkup", duration: "30 min", /*price: "5,000 RWF"*/ },/**/

  { id: "cleaning", name: "Teeth Cleaning", duration: "45 min"/* price: "15,000 RWF"*/ },
  { id: "filling", name: "Dental Filling", duration: "45 min" /*price: "15,000 RWF" */},
  { id: "whitening", name: "Teeth Whitening", duration: "60 min"/* price: "30,000 RWF"*/ },
  { id: "rootcanal", name: "Root Canal", duration: "90 min"/*, price: "50,000 RWF"*/ },
  { id: "extraction", name: "Tooth Extraction", duration: "30 min"/*, price: "10,000 RWF"*/ },
];

const doctors = [
  { id: "Evode", name: "Dr. Evode habineza", specialty: "Lead Dentist & Clinic Director" },
  { id: "Jeanette", name: "Jeanette Uwamariya", specialty: "Dental Assistant" },
  { id: "Samuel", name: "Dr. Samuel Niyonkuru", specialty: "BDS" },
];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
];

const BookAppointment = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch booked slots when date changes
  const fetchBookedSlots = async (date: string) => {
    setLoadingSlots(true);
    setSelectedTime("");
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time, duration_minutes")
        .eq("appointment_date", date)
        .neq("status", "cancelled");

      if (error) throw error;

      // Build list of occupied time slots
      const occupied: string[] = [];
      (data || []).forEach((appt) => {
        const [h, m] = appt.appointment_time.split(":").map(Number);
        const startMin = h * 60 + m;
        const dur = appt.duration_minutes || 30;
        // Mark every 30-min slot that overlaps this appointment
        for (let t = startMin; t < startMin + dur; t += 30) {
          const hh = String(Math.floor(t / 60)).padStart(2, "0");
          const mm = String(t % 60).padStart(2, "0");
          occupied.push(`${hh}:${mm}`);
        }
      });
      setBookedSlots(occupied);
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // First, create or find the patient
      const { data: existingPatient, error: findError } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", patientInfo.phone)
        .maybeSingle();

      let patientId: string;

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        // Create new patient record
        const { data: newPatient, error: createPatientError } = await supabase
          .from("patients")
          .insert({
            full_name: patientInfo.name,
            phone: patientInfo.phone,
            email: patientInfo.email || null,
          })
          .select("id")
          .single();

        if (createPatientError) throw createPatientError;
        patientId = newPatient.id;
      }

      // Get service details for duration
      const selectedServiceData = services.find(s => s.id === selectedService);
      const durationMinutes = selectedServiceData?.duration ? 
        parseInt(selectedServiceData.duration) : 30;

      // Create the appointment
      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          notes: patientInfo.notes || null,
          status: "pending",
          duration_minutes: durationMinutes,
        });

      if (appointmentError) throw appointmentError;

      // Send email notification via Formspree
      const selectedServiceData2 = services.find(s => s.id === selectedService);
      const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
      try {
        await fetch("https://formspree.io/f/mzdkgvok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _subject: `New Appointment Booking: ${patientInfo.name}`,
            _replyto: patientInfo.email || undefined,
            patient_name: patientInfo.name,
            phone: patientInfo.phone,
            "patient email": patientInfo.email || "Not provided",
            service: selectedServiceData2?.name || selectedService,
            doctor: selectedDoctorData?.name || "No preference",
            date: selectedDate,
            time: selectedTime,
            notes: patientInfo.notes || "None",
          }),
        });
      } catch {
        // Notification failure shouldn't block the user
      }

      toast({
        title: "Appointment Booked!✔✔",
        description: "We'll send you a confirmation shortly.",
      });
      
      setStep(5); // Success step
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedService;
      case 2: return true; // Doctor is optional
      case 3: return !!selectedDate && !!selectedTime;
      case 4: return !!patientInfo.name && !!patientInfo.phone;
      default: return false;
    }
  };

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  return (
    <PublicLayout>
      <SEOHead 
        title="Book Appointment | Muhazi Dental Clinic"
        description="Book your dental appointment online at Muhazi Dental Clinic, Rwamagana. Choose from our services including checkups, cleaning, whitening, and more."
        canonical="/book"
        keywords="book dental appointment, online booking, Rwamagana dentist appointment, schedule dental visit, dental booking Rwanda"
      />
      <BookingGuide />
      {/* Hero */}
      <section className="py-12 bg-gradient-to-b from-muted to-background">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Book Online</span>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-4">
              Schedule Your Appointment
            </h1>
            <p className="text-muted-foreground">
              Book your dental appointment in just a few easy steps
            </p>
          </div>
        </div>
      </section>

      {/* Progress Steps */}
      {step < 5 && (
        <section className="py-6 bg-background border-b border-border">
          <div className="container-custom">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 sm:gap-4">
                {[
                  { num: 1, label: "Service" },
                  { num: 2, label: "Doctor" },
                  { num: 3, label: "Date & Time" },
                  { num: 4, label: "Details" },
                ].map((s, i) => (
                  <div key={s.num} className="flex items-center gap-2 sm:gap-4">
                    <div className={`flex items-center gap-2 ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step > s.num ? 'bg-primary text-primary-foreground' : 
                        step === s.num ? 'bg-primary text-primary-foreground' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                    </div>
                    {i < 3 && <div className={`w-8 sm:w-12 h-0.5 ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking Form */}
      <section className="section-padding bg-background">
        <div className="container-custom max-w-3xl">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <Stethoscope className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold">Select a Service</h2>
                <p className="text-muted-foreground">Choose the dental service you need</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    variant={selectedService === service.id ? "elevated" : "interactive"}
                    className={`cursor-pointer transition-all ${
                      selectedService === service.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardContent className="p-4">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">{service.duration}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Doctor */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <User className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold">Choose a Doctor (Optional)</h2>
                <p className="text-muted-foreground">Select your preferred dentist or skip to see any available</p>
              </div>
              <div className="grid gap-4">
                <Card
                  variant={selectedDoctor === "" ? "elevated" : "interactive"}
                  className={`cursor-pointer transition-all ${
                    selectedDoctor === "" ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedDoctor("")}
                >
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold">Any Available Doctor</h3>
                    <p className="text-sm text-muted-foreground">We'll assign you to the next available dentist</p>
                  </CardContent>
                </Card>
                {doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    variant={selectedDoctor === doctor.id ? "elevated" : "interactive"}
                    className={`cursor-pointer transition-all ${
                      selectedDoctor === doctor.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDoctor(doctor.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-lg font-bold text-primary-foreground">
                        {doctor.name.split(" ")[1][0]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{doctor.name}</h3>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Date & Time */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold">Choose Date & Time</h2>
                <p className="text-muted-foreground">Select your preferred appointment slot</p>
              </div>
              
              {/* Date Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Date</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dates.map((date, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const dateStr = date.toISOString().split('T')[0];
                        setSelectedDate(dateStr);
                        fetchBookedSlots(dateStr);
                      }}
                      className={`flex flex-col items-center min-w-[70px] p-3 rounded-xl border transition-all ${
                        selectedDate === date.toISOString().split('T')[0]
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary'
                      }`}
                    >
                      <span className="text-xs uppercase">
                        {date.toLocaleDateString('en', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-bold">{date.getDate()}</span>
                      <span className="text-xs">
                        {date.toLocaleDateString('en', { month: 'short' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="animate-fade-in">
                  <Label className="text-base font-semibold mb-3 block">
                    Select Time {loadingSlots && <span className="text-muted-foreground text-xs ml-2">Loading availability...</span>}
                  </Label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {timeSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      return (
                        <button
                          key={time}
                          onClick={() => !isBooked && setSelectedTime(time)}
                          disabled={isBooked}
                          className={`p-2 rounded-lg text-sm font-medium border transition-all ${
                            isBooked
                              ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed line-through'
                              : selectedTime === time
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card border-border hover:border-primary'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {bookedSlots.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Crossed-out times are already booked
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Patient Details */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold">Your Details</h2>
                <p className="text-muted-foreground">Please provide your contact information</p>
              </div>
              
              <Card variant="elevated" className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+250 7XX XXX XXX"
                      value={patientInfo.phone}
                      onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={patientInfo.email}
                      onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Any special requests or concerns?"
                      value={patientInfo.notes}
                      onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Summary */}
              <Card variant="default" className="p-6 bg-muted">
                <h3 className="font-semibold mb-4">Appointment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">{services.find(s => s.id === selectedService)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doctor:</span>
                    <span className="font-medium">
                      {selectedDoctor ? doctors.find(d => d.id === selectedDoctor)?.name : 'Any Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {new Date(selectedDate).toLocaleDateString('en', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="text-center py-12 animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full hero-gradient flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">Appointment Booked!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your appointment has been successfully scheduled. We'll send you a confirmation 
                message shortly on WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="default" asChild>
                  <Link to="/">Return Home</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://wa.me/250787630399" target="_blank" rel="noopener noreferrer">
                    Contact Us on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="flex justify-between mt-10 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              {step < 4 ? (
                <Button
                  variant="hero"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="hero"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? "Booking..." : "Confirm Booking"}
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default BookAppointment;
