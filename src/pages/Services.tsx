import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Smile, 
  Sparkles, 
  Shield, 
  Heart, 
  Stethoscope,
  Syringe,
  CircleDot,
  Baby,
  Clock,
  ArrowRight,
  Check
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";

const services = [
  {
    icon: Stethoscope,
    title: "General Dentistry",
    description: "Comprehensive oral examinations, professional cleanings, and preventive care to maintain your dental health.",
    features: ["Dental Checkups", "Teeth Cleaning", "X-rays", "Oral Cancer Screening"],
    //price: "From 5,000 RWF",
    category: "Routine",
  },
  {
    icon: Shield,
    title: "Dental Fillings",
    description: "Restore damaged teeth with high-quality, tooth-colored composite fillings that blend naturally.",
    features: ["Composite Fillings", "Amalgam Fillings", "Cavity Treatment", "Tooth Restoration"],
    //price: "From 15,000 RWF",
    category: "Routine",
  },
  {
    icon: Heart,
    title: "Root Canal Therapy",
    description: "Save infected teeth with painless root canal treatment using modern techniques and anesthesia.",
    features: ["Pain Relief", "Tooth Preservation", "Infection Treatment", "Crown Placement"],
  //  price: "From 50,000 RWF",
    category: "Restorative",
  },
  {
    icon: Sparkles,
    title: "Teeth Whitening",
    description: "Professional whitening treatments for a brighter, more confident smile that lasts.",
    features: ["In-Office Whitening", "Take-Home Kits", "Stain Removal", "Long-lasting Results"],
   // price: "From 30,000 RWF",
    category: "Cosmetic",
  },
  {
    icon: CircleDot,
    title: "Dental Implants",
    description: "Permanent tooth replacement solutions that look, feel, and function like natural teeth.",
    features: ["Single Implants", "Full Arch", "Bone Grafting", "Implant Crowns"],
  //  price: "From 300,000 RWF",
    category: "Restorative",
  },
  {
    icon: Smile,
    title: "Crowns & Bridges",
    description: "Custom-made dental crowns and bridges to restore damaged or missing teeth.",
    features: ["Porcelain Crowns", "Dental Bridges", "Crown Replacement", "Tooth Caps"],
   // price: "From 80,000 RWF",
    category: "Restorative",
  },
  {
    icon: Syringe,
    title: "Tooth Extraction",
    description: "Safe and comfortable tooth removal when necessary, including wisdom teeth.",
    features: ["Simple Extraction", "Surgical Extraction", "Wisdom Teeth", "Post-Op Care"],
  //  price: "From 10,000 RWF",
    category: "Emergency",
  },
  {
    icon: Baby,
    title: "Pediatric Dentistry",
    description: "Gentle, child-friendly dental care to establish healthy habits from an early age.",
    features: ["Kids Checkups", "Sealants", "Fluoride Treatment", "Cavity Prevention"],
  //  price: "From 5,000 RWF",
    category: "Routine",
  },
];

const categories = ["All", "Routine", "Cosmetic", "Restorative", "Emergency"];

const Services = () => {
  return (
    <PublicLayout>
      <SEOHead 
        title="Dental Services | Muhazi Dental Clinic"
        description="Explore our comprehensive dental services: teeth cleaning, fillings, root canal, whitening, implants, and pediatric dentistry in Rwamagana, Rwanda."
        canonical="/services"
        keywords="dental services, teeth cleaning, dental fillings, root canal, teeth whitening, dental implants, pediatric dentistry, Rwamagana, Rwanda"
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-muted to-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Services</span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-2 mb-6">
              Comprehensive Dental Care
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              From routine checkups to advanced treatments, we offer a full range of dental 
              services to meet all your oral health needs.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/book">
                Book an Appointment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card 
                key={index} 
                variant="interactive"
                className="group overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <service.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary-light text-primary">
                      {service.category}
                    </span>
                  </div>
                  <CardTitle asChild><h2 className="text-xl">{service.title}</h2></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/book">
                        Book Now
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Note */}
      <section className="py-12 bg-muted">
        <div className="container-custom">
          <Card variant="default" className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-lg mb-2">Pricing & Payment Options</h3>
                <p className="text-muted-foreground text-sm">
                  Prices shown are starting prices. Final costs depend on the complexity of treatment. 
                  We accept cash, MTN Mobile Money, and Airtel Money. Contact us for a detailed quote 
                  after your consultation.
                </p>
              </div>
              <Button variant="default" asChild className="shrink-0">
                <a href="tel:+250787630399">
                  Get a Quote
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding hero-gradient">
        <div className="container-custom text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-primary-foreground mb-4">
            Need a Specific Treatment?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Contact us to discuss your dental needs. We'll create a personalized treatment plan just for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <Link to="/book">Book Appointment</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Services;
