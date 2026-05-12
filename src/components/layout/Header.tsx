import { Phone, Mail, MapPin, Clock, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/doctors", label: "Doctors" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container-custom px-4 flex flex-wrap justify-between items-center text-sm gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <a href="tel:+250787630399" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Phone className="w-3.5 h-3.5" />
              <span>+250 787 630 399</span>
            </a>
            <span className="hidden sm:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>8:00 AM - 8:00 PM</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rwamagana, Rwanda</span>
            <span className="sm:hidden">Rwamagana</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="container-custom px-4 flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/mdc-logo.jpg" 
              alt="Muhazi Dental Clinic Logo" 
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl object-cover shadow-soft"
            />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg lg:text-xl text-foreground">Muhazi</span>
              <span className="text-xs lg:text-sm text-muted-foreground -mt-0.5">Dental Clinic</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? "bg-primary-light text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Staff Login</Link>
            </Button>
            <Button variant="hero" size="default" asChild>
              <Link to="/book">Book Appointment</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card animate-fade-in">
            <div className="container-custom px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-primary-light text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-border">
                <Button variant="outline" asChild>
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Staff Login</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/book" onClick={() => setIsMenuOpen(false)}>Book Appointment</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
