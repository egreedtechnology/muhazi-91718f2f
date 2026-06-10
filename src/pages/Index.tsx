import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  Calendar, 
  Shield, 
  Heart, 
  Smile, 
  Clock, 
  Award, 
  Users, 
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import heroDental from "@/assets/hero-dental.jpg";
import heroClinicReception from "@/assets/hero-clinic-reception.jpg";
import heroDentistPatient from "@/assets/hero-dentist-patient.jpg";
import heroHealthySmile from "@/assets/hero-healthy-smile.jpg";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeroSlide {
  image: string;
  title: string;
  highlight: string;
  description: string;
}

const defaultHeroSlides: (HeroSlide & { alt: string })[] = [
  {
    image: heroClinicReception,
    title: "Excellence in Dentistry",
    highlight: " Your Smile is Our  Priority",
    description: "Experience world-class dental care at Muhazi Dental Clinic. Our expert team provides comprehensive dental services in a comfortable, modern environment.",
    alt: "Modern Muhazi Dental Clinic reception area in Rwamagana",
  },
  {
    image: heroDentistPatient,
    title: "Excellence in Dentistry",
    highlight: "Expert Care for   Your Dental Health",
    description: "Our skilled dentists provide personalized treatment with the latest techniques and equipment.",
    alt: "Dentist examining a patient at Muhazi Dental Clinic",
  },
  {
    image: heroHealthySmile,
    title: "Excellence in Dentistry",
    highlight: "Achieve the Perfect  Smile You Deserve",
    description: "From teeth whitening to complete dental makeovers, we help you achieve the smile of your dreams.",
    alt: "Happy patient with a healthy white smile",
  },
];

const services = [
  {
    icon: Smile,
    title: "General Dentistry",
    description: "Complete dental checkups, cleanings, and preventive care for the whole family.",
  },
  {
    icon: Sparkles,
    title: "Teeth Whitening",
    description: "Professional whitening treatments for a brighter, more confident smile.",
  },
  {
    icon: Shield,
    title: "Dental Fillings",
    description: "High-quality tooth-colored fillings to restore damaged teeth naturally.",
  },
  {
    icon: Heart,
    title: "Root Canal",
    description: "Painless root canal therapy to save infected teeth and relieve pain.",
  },
];

const stats = [
  { value: "5000+", label: "Happy Patients" },
  { value: "10+", label: "Years Experience" },
  { value: "15+", label: "Dental Services" },
  { value: "98%", label: "Success Rate" },
];

const testimonials = [
  {
    name: "Jean Pierre M.",
    text: "Excellent service! The staff is very professional and the clinic is clean and modern. I highly recommend Muhazi Dental Clinic.",
    rating: 5,
  },
  {
    name: "Grace U.",
    text: "I was nervous about my root canal but Dr. Evode made me feel comfortable throughout the procedure. Thank you!",
    rating: 5,
  },
  {
    name: "Patrick K.",
    text: "Best dental clinic in Rwamagana. Fair prices and quality treatment. My whole family comes here.",
    rating: 5,
  },
];

const Index = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(defaultHeroSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchHeroSlides = async () => {
      const { data } = await supabase
        .from("gallery_media")
        .select("media_url, title")
        .eq("is_hero_slide", true)
        .eq("is_active", true)
        .order("display_order");
      
      if (data && data.length > 0) {
        setHeroSlides(data.map((item, i) => ({
          image: item.media_url,
          title: i === 0 ? "Exellent in Dentist" : "Welcome to",
          highlight: i === 0 ? "Your Smile is Our  Priority" : "Muhazi Dental Clinic",
          description: "Experience world-class dental care at Muhazi Dental Clinic with our expert team.",
        })));
      }
    };
    fetchHeroSlides();
  }, []);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const goToSlide = (index: number) => {
    if (index !== currentSlide) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <PublicLayout>
      <SEOHead 
        title="Muhazi Dental Clinic | Exellent in  Dentist Care in Rwamagana, Rwanda"
        description="Muhazi Dental Clinic offers comprehensive dental care in Rwamagana, Rwanda. Book your appointment for teeth cleaning, fillings, root canal, whitening & more. Open 7 days."
        canonical="/"
      />
      {/* Hero Section with Image Carousel */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Images with Transition */}
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img 
              src={slide.image} 
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
          </div>
        ))}

        {/* Slide Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm hover:bg-primary-foreground/30 transition-colors text-primary-foreground"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm hover:bg-primary-foreground/30 transition-colors text-primary-foreground"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? "bg-primary w-8" 
                  : "bg-primary-foreground/50 hover:bg-primary-foreground/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="container-custom px-4 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm mb-6 animate-fade-in">
              <Star className="w-4 h-4 fill-current" />
              <span>Trusted Dental Care in Rwanda</span>
            </div>
            
            <h1 
              className={`text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-primary-foreground mb-6 leading-tight transition-all duration-300 ${
                isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {heroSlides[currentSlide].title}
              <span className="block text-primary">{heroSlides[currentSlide].highlight}</span>
            </h1>
            
            <p 
              className={`text-lg text-primary-foreground/80 mb-8 max-w-xl transition-all duration-300 delay-100 ${
                isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {heroSlides[currentSlide].description}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/book">
                  <Calendar className="w-5 h-5" />
                  Book Appointment
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <a href="tel:+250787630399">
                  <Phone className="w-5 h-5" />
                  Call Now
                </a>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-primary-foreground/10 backdrop-blur-sm rounded-xl border border-primary-foreground/20">
                  <div className="text-2xl sm:text-3xl font-heading font-bold text-primary-foreground">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-4">
              Comprehensive Dental Care
            </h2>
            <p className="text-muted-foreground">
              We offer a full range of dental services to keep your smile healthy and beautiful.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card 
                key={index} 
                variant="interactive"
                className={`group animate-fade-in animation-delay-${index * 100}`}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl hero-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button variant="outline" size="lg" asChild>
              <Link to="/services">
                View All Services
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-6">
                Quality Dental Care You Can Trust
              </h2>
              <p className="text-muted-foreground mb-8">
                At Muhazi Dental Clinic, we combine expertise with compassion to deliver exceptional 
                dental care. Our state-of-the-art facility and experienced team ensure you receive 
                the best treatment possible.
              </p>

              <div className="space-y-4">
                {[
                  "Modern equipment and sterilization protocols",
                  "Experienced and caring dental professionals",
                  "Comfortable and relaxing environment",
                  "Affordable pricing with payment options",
                  "Convenient location in Rwamagana",
                  "Open 7 days a week, 8 AM - 8 PM",
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button variant="default" size="lg" className="mt-8" asChild>
                <Link to="/about">
                  Learn More About Us
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card variant="elevated" className="p-6 text-center">
                <Award className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-semibold mb-1">Certified</h3>
                <p className="text-sm text-muted-foreground">Licensed professionals</p>
              </Card>
              <Card variant="elevated" className="p-6 text-center mt-8">
                <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-semibold mb-1">Flexible Hours</h3>
                <p className="text-sm text-muted-foreground">Open 7 days a week</p>
              </Card>
              <Card variant="elevated" className="p-6 text-center">
                <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-semibold mb-1">Family Care</h3>
                <p className="text-sm text-muted-foreground">All ages welcome</p>
              </Card>
              <Card variant="elevated" className="p-6 text-center mt-8">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-semibold mb-1">Safe & Clean</h3>
                <p className="text-sm text-muted-foreground">Strict protocols</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-4">
              What Our Patients Say
            </h2>
            <p className="text-muted-foreground">
              Don't just take our word for it. Here's what our patients have to say about their experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} variant="default" className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-accent fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                <div className="font-semibold">{testimonial.name}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding hero-gradient">
        <div className="container-custom text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Book your appointment today and take the first step towards a healthier, brighter smile.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/book">
                <Calendar className="w-5 h-5" />
                Book Appointment
              </Link>
            </Button>
            <Button 
              size="xl" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <a href="https://wa.link/x0ap6w" target="_blank" rel="noopener noreferrer">
                <Phone className="w-5 h-5" />
                WhatsApp Us
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Index;
