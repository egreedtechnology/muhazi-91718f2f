import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Target, 
  Eye, 
  Heart, 
  Award,
  Users,
  Clock,
  Shield,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";

const values = [
  {
    icon: Heart,
    title: "Compassion",
    description: "We treat every patient with empathy, understanding, and genuine care.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We strive for the highest standards in dental care and patient service.",
  },
  {
    icon: Shield,
    title: "Integrity",
    description: "Honest, transparent communication about treatments and pricing.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Committed to improving oral health in the Rwamagana community.",
  },
];

const About = () => {
  return (
    <PublicLayout>
      <SEOHead 
        title="About Us | Muhazi Dental Clinic"
        description="Learn about Muhazi Dental Clinic's mission, values, and experienced team. Providing quality dental care in Rwamagana, Rwanda since our founding."
        canonical="/about"
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-muted to-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">About Us</span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-2 mb-6">
              Your Trusted Dental Partner in Rwamagana
            </h1>
            <p className="text-lg text-muted-foreground">
              Muhazi Dental Clinic has been serving the Eastern Province of Rwanda with quality 
              dental care, combining modern techniques with a patient-first approach.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Muhazi Dental Clinic was founded with a simple mission: to provide accessible, 
                  high-quality dental care to the people of Rwamagana and the surrounding communities 
                  in Rwanda's Eastern Province.
                </p>
                <p>
                  Located on the 2nd floor above the MTN branch in the heart of Rwamagana, 
                  our clinic offers a convenient, modern facility equipped with the latest 
                  dental technology. We understand that visiting the dentist can be stressful, 
                  which is why we've created a warm, welcoming environment where patients feel 
                  comfortable and cared for.
                </p>
                <p>
                  Our team of experienced dental professionals is dedicated to helping you achieve 
                  and maintain optimal oral health. From routine checkups to complex procedures, 
                  we provide comprehensive dental services for patients of all ages.
                </p>
              </div>
            </div>
            <div className="bg-muted rounded-2xl p-8 lg:p-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-heading font-bold text-primary">10+</div>
                  <div className="text-sm text-muted-foreground mt-1">Years of Service</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-heading font-bold text-primary">5000+</div>
                  <div className="text-sm text-muted-foreground mt-1">Happy Patients</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-heading font-bold text-primary">15+</div>
                  <div className="text-sm text-muted-foreground mt-1">Services Offered</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-heading font-bold text-primary">7</div>
                  <div className="text-sm text-muted-foreground mt-1">Days Open</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8">
            <Card variant="elevated" className="p-8">
              <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                To deliver exceptional dental care that improves the oral health and overall 
                well-being of our patients. We are committed to providing personalized treatment 
                in a comfortable, caring environment using the latest techniques and technology.
              </p>
            </Card>
            <Card variant="elevated" className="p-8">
              <div className="w-14 h-14 rounded-2xl warm-gradient flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground">
                To be the leading dental care provider in Eastern Rwanda, recognized for 
                excellence in patient care, innovative treatments, and community health 
                education. We envision a community where everyone has access to quality 
                dental care and understands the importance of oral health.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-4">
              What Guides Us
            </h2>
            <p className="text-muted-foreground">
              Our core values shape everything we do at Muhazi Dental Clinic.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} variant="interactive" className="p-6 text-center group">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-light flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                  <value.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold mt-2">
                The Muhazi Difference
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Modern Facility",
                  description: "State-of-the-art equipment and a clean, comfortable environment",
                },
                {
                  title: "Experienced Team",
                  description: "Skilled dental professionals dedicated to your care",
                },
                {
                  title: "Comprehensive Services",
                  description: "From checkups to complex procedures, all under one roof",
                },
                {
                  title: "Patient-Centered Care",
                  description: "Personalized treatment plans tailored to your needs",
                },
                {
                  title: "Convenient Hours",
                  description: "Open 7 days a week from 8 AM to 8 PM",
                },
                {
                  title: "Affordable Pricing",
                  description: "Quality care at fair prices with flexible payment options",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-card rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button variant="hero" size="lg" asChild>
                <Link to="/book">
                  Book Your Visit Today
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default About;
