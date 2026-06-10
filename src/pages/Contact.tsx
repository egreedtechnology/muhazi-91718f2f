import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageCircle,
  Send
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import StructuredData from "@/components/seo/StructuredData";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    content: "+250 787 630 399",
    href: "tel:+250787630399",
    description: "Call us directly",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    content: "+250 787 630 399",
    href: "https://wa.me/250787630399",
    description: "Message us on WhatsApp",
  },
  {
    icon: Mail,
    title: "Email",
    content: "info@muhazidental.rw",
    href: "mailto:info@muhazidental.rw",
    description: "Send us an email",
  },
  {
    icon: MapPin,
    title: "Location",
    content: "2nd Floor, Above MTN Branch, Rwamagana",
    href: "https://maps.google.com/?q=Rwamagana,Rwanda",
    description: "Visit our clinic",
  },
];

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const full_name = (formData.get("name") as string).trim();
    const phone = (formData.get("phone") as string).trim();
    const email = (formData.get("email") as string)?.trim() || null;
    const subject = (formData.get("subject") as string).trim();
    const message = (formData.get("message") as string).trim();

    // Basic validation
    if (!full_name || !phone || !subject || !message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("messages").insert({
      full_name,
      phone,
      email,
      subject,
      message,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } else {
      // Send email notification via Formspree
      try {
        await fetch("https://formspree.io/f/mzdkgvok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _subject: `New Contact Message: ${subject}`,
            _replyto: email || undefined,
            name: full_name,
            phone,
            "sender email": email || "Not provided",
            subject,
            message,
          }),
        });
      } catch {
        // Notification failure shouldn't block the user
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });
      (e.target as HTMLFormElement).reset();
    }
    
    setIsSubmitting(false);
  };

  return (
    <PublicLayout>
      <SEOHead 
        title="Contact Muhazi Dental Clinic — Rwamagana, Rwanda"
        description="Call +250 787 630 399, WhatsApp, or visit us at 2nd Floor above MTN Branch in Rwamagana. Open 7 days, 8AM–8PM. Email info@muhazidentalclinic.org."
        canonical="/contact"
        keywords="contact Muhazi Dental, Rwamagana dentist contact, dental clinic phone Rwanda, clinic location Rwamagana, WhatsApp dentist, eGreed Technology"
        ogImageAlt="Contact Muhazi Dental Clinic in Rwamagana, Rwanda"
      />
      <StructuredData
        id="ld-contact-page"
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Muhazi Dental Clinic",
          url: "https://muhazidentalclinic.org/contact",
          inLanguage: "en-RW",
          isPartOf: { "@type": "WebSite", url: "https://muhazidentalclinic.org" },
          creator: {
            "@type": "Organization",
            name: "eGreed Technology",
            url: "https://egreedtech.org",
          },
        }}
      />
      <StructuredData
        id="ld-contact-localbusiness"
        data={{
          "@context": "https://schema.org",
          "@type": ["Dentist", "LocalBusiness", "MedicalBusiness"],
          name: "Muhazi Dental Clinic",
          image: "https://muhazidentalclinic.org/mdc-logo.jpg",
          logo: "https://muhazidentalclinic.org/mdc-logo.jpg",
          url: "https://muhazidentalclinic.org",
          telephone: "+250787630399",
          email: "info@muhazidentalclinic.org",
          priceRange: "$$",
          address: {
            "@type": "PostalAddress",
            streetAddress: "2nd Floor, Above MTN Branch",
            addressLocality: "Rwamagana",
            addressRegion: "Eastern Province",
            addressCountry: "RW",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: -1.9486,
            longitude: 30.4347,
          },
          hasMap: "https://maps.google.com/?q=Muhazi+Dental+Clinic+Rwamagana",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: "08:00",
              closes: "20:00",
            },
          ],
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: "+250787630399",
              contactType: "Reservations",
              areaServed: "RW",
              availableLanguage: ["English", "Kinyarwanda", "French"],
              contactOption: ["TollFree", "HearingImpairedSupported"],
            },
            {
              "@type": "ContactPoint",
              telephone: "+250787630399",
              contactType: "Customer Support",
              areaServed: "RW",
              availableLanguage: ["English", "Kinyarwanda", "French"],
            },
          ],
          sameAs: [
            "https://www.facebook.com/muhazidc",
            "https://www.instagram.com/muhazi_dental",
            "https://www.tiktok.com/@muhazidc",
            "https://x.com/muhazidc",
          ],
        }}
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-muted to-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Contact Us</span>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mt-2 mb-6">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions or want to schedule an appointment? We're here to help. 
              Reach out to us through any of the channels below.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 bg-background">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((item, index) => (
              <a
                key={index}
                href={item.href}
                target={item.icon === MapPin || item.icon === MessageCircle ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block"
              >
                <Card variant="interactive" className="h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl hero-gradient flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                    <p className="font-medium text-primary text-sm">{item.content}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card variant="elevated" className="p-6 md:p-8">
              <h2 className="text-2xl font-heading font-bold mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" name="name" placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+250 7XX XXX XXX" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="How can we help you?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Your Message</Label>
                  <Textarea 
                    id="message" 
                    name="message"
                    placeholder="Tell us more about your inquiry..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
                <Button variant="hero" size="lg" type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Sending..." : "Send Message"}
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>

            {/* Map & Hours */}
            <div className="space-y-6">
              <Card variant="elevated" className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15953.238611595766!2d30.421!3d-1.9520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca0!2sRwamagana!5e0!3m2!1sen!2srw!4v1"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Clinic Location"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Our Location</h3>
                      <p className="text-muted-foreground text-sm">
                        2nd Floor, Above MTN Branch<br />
                        Rwamagana, Eastern Province, Rwanda
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated" className="p-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-3">Opening Hours</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monday - Friday</span>
                        <span className="font-medium">8:00 AM - 8:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saturday</span>
                        <span className="font-medium">8:00 AM - 8:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sunday</span>
                        <span className="font-medium">8:00 AM - 8:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card variant="default" className="p-6 hero-gradient">
                <h3 className="font-heading font-bold text-primary-foreground mb-2">
                  Emergency Dental Care
                </h3>
                <p className="text-primary-foreground/80 text-sm mb-4">
                  Experiencing a dental emergency? Call us immediately.
                </p>
                <Button 
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <a href="tel:+250787630399">
                    <Phone className="w-4 h-4" />
                    Call Now
                  </a>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
