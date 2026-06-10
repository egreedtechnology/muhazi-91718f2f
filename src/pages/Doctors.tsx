import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Award,
  GraduationCap,
  Calendar,
  ArrowRight
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";

const doctors = [
  {
    name: "Dr. Evode habineza",
    title: "Lead Dentist & Clinic Director",
    specialization: "General & Cosmetic Dentistry",
    experience: "12+ years experience",
    education: "University of Rwanda, School of Dentistry",
    bio: "Dr. Evode is the Chief Executive Officer of Muhazi Dental Clinic, where he leads the clinic’s strategic vision, operations, and growth. With a strong commitment to excellence in healthcare delivery, he ensures that the clinic maintains the highest standards of professionalism, innovation, and patient-centered care. Under his leadership, Muhazi Dental Clinic continues to grow as a trusted dental care provider in Rwamagana and beyond.",
    avatar: "Ev",
  },
  {

  name: "Jeanette Uwamariya",
  title: "Dental Assistant",
  specialization: "Endodontics & Root Canal Support",
  experience: "8+ years of professional experience",
  education: "University of Rwanda – School of Dentistry",
  bio: "Jeanette Uwamariya is a skilled Dental Assistant with extensive experience in endodontic and root canal procedures. She plays a vital role in supporting clinical operations and ensuring patient comfort throughout treatment. Known for her professionalism, precision, and compassionate approach, Jeanette helps create a calm and reassuring environment for patients while maintaining high standards of clinical care.",
  avatar: "Je",


  },
  {
    
  name: "Dr. Samuel Niyonkuru",
  title: "BDS",
  specialization: "Oral Surgery & Dental Implants",
  experience: "6+ years of clinical experience",
  education: "University of Rwanda – School of Dentistry",
  bio: "Dr. Samuel Niyonkuru is a qualified dental surgeon with specialized expertise in oral surgery and dental implant procedures. He is dedicated to delivering safe, precise, and pain-free treatments while achieving excellent clinical outcomes. Known for his professionalism and patient-focused care, Dr. Samuel is committed to restoring oral function and confidence through advanced surgical dentistry.",
 avatar: "Sa",
  },
];

const Doctors = () => {
  return (
    <PublicLayout>
      <SEOHead 
        title="Our Dentists | Muhazi Dental Clinic"
        description="Meet our experienced dental professionals at Muhazi Dental Clinic in Rwamagana, Rwanda. Expert care from qualified dentists."
        canonical="/doctors"
        keywords="dentist Rwamagana, dental experts Rwanda, Dr. Evode habineza, dental team, Muhazi Dental"
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-muted to-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Team</span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-2 mb-6">
              Meet Our Dental Experts
            </h1>
            <p className="text-lg text-muted-foreground">
              Our team of experienced dental professionals is dedicated to providing 
              you with the highest quality care in a comfortable environment.
            </p>
          </div>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.map((doctor, index) => (
              <Card 
                key={index} 
                variant="elevated"
                className="overflow-hidden group"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-light to-muted flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full hero-gradient flex items-center justify-center text-5xl font-heading font-bold text-primary-foreground shadow-glow">
                    {doctor.avatar}
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h2 className="font-heading font-bold text-xl">{doctor.name}</h2>
                    <p className="text-primary font-medium">{doctor.title}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary shrink-0" />
                      <span>{doctor.specialization}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>{doctor.experience}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                      <span>{doctor.education}</span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm">{doctor.bio}</p>

                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/book">
                      Book with {doctor.name.split(" ")[1]}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Join Our Team */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <Card variant="default" className="p-8 md:p-12 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-heading font-bold mb-4">Join Our Team</h2>
            <p className="text-muted-foreground mb-6">
              We're always looking for talented dental professionals who share our 
              passion for patient care. If you're interested in joining our team, 
              we'd love to hear from you.
            </p>
            <Button variant="default" asChild>
              <Link to="/contact">
                Get in Touch
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding hero-gradient">
        <div className="container-custom text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-primary-foreground mb-4">
            Ready to Meet Our Team?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Book an appointment today and experience the difference of personalized dental care.
          </p>
          <Button 
            size="lg" 
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            asChild
          >
            <Link to="/book">
              <Calendar className="w-5 h-5" />
              Book Your Appointment
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Doctors;
