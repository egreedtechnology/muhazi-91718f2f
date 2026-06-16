import { useState, useEffect } from "react";
import { X, Play, ChevronLeft, ChevronRight } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
}

const categories = [
  { id: "all", label: "All" },
  { id: "clinic_tour", label: "Clinic Tour" },
  { id: "procedures", label: "Procedures" },
  { id: "team_in_action", label: "Team in Action" },
  { id: "facilities", label: "Facilities" },
];

// Placeholder images for demo
const placeholderMedia: GalleryItem[] = [
  {
    id: "1",
    title: "Modern Reception Area",
    description: "Our welcoming reception area",
    category: "clinic_tour",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800",
    thumbnail_url: null,
  },
  {
    id: "2",
    title: "Dental Treatment Room",
    description: "State-of-the-art dental equipment",
    category: "facilities",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800",
    thumbnail_url: null,
  },
  {
    id: "3",
    title: "Our Dental Team",
    description: "Professional and caring staff",
    category: "team_in_action",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800",
    thumbnail_url: null,
  },
  {
    id: "4",
    title: "Advanced Equipment",
    description: "Latest dental technology",
    category: "facilities",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800",
    thumbnail_url: null,
  },
  {
    id: "5",
    title: "Patient Care",
    description: "Personalized treatment",
    category: "procedures",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1445527815219-ecbfec67492e?w=800",
    thumbnail_url: null,
  },
  {
    id: "6",
    title: "Waiting Lounge",
    description: "Comfortable waiting area",
    category: "clinic_tour",
    media_type: "image",
    media_url: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800",
    thumbnail_url: null,
  },
];

const Gallery = () => {
  const [media, setMedia] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchGalleryMedia();
  }, []);

  const fetchGalleryMedia = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("gallery_media")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setMedia(data);
    }
    setIsLoading(false);
  };

  const filteredMedia = selectedCategory === "all" 
    ? media 
    : media.filter(item => item.category === selectedCategory);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentIndex(prev => (prev === 0 ? filteredMedia.length - 1 : prev - 1));
    } else {
      setCurrentIndex(prev => (prev === filteredMedia.length - 1 ? 0 : prev + 1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox("prev");
      if (e.key === "ArrowRight") navigateLightbox("next");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, filteredMedia.length]);

  return (
    <PublicLayout>
      <SEOHead 
        title="Gallery | Muhazi Dental Clinic"
        description="View photos and videos of Muhazi Dental Clinic's modern facilities, procedures, and team in action. See our clinic in Rwamagana, Rwanda."
        canonical="/gallery"
        keywords="dental clinic photos, Muhazi Dental gallery, clinic facilities, dental procedures, Rwamagana clinic"
      />
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container-custom px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
            Our Gallery
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Take a virtual tour of our modern dental clinic and see our team in action
          </p>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16">
        <div className="container-custom px-4">
          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item, index) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-xl cursor-pointer shadow-soft hover:shadow-lg transition-all duration-300"
                onClick={() => openLightbox(index)}
              >
                <div className="aspect-[4/3] relative">
                  {item.media_type === "video" ? (
                    <>
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-8 h-8 text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {/* Watermark */}
                  <div className="absolute bottom-2 right-2 opacity-50">
                    <img src="/mdc-logo.jpg" alt="" className="w-8 h-8 rounded" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-white/80">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMedia.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No media found in this category.
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors z-10"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={() => navigateLightbox("prev")}
            className="absolute left-4 text-white hover:text-white/80 transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <button
            onClick={() => navigateLightbox("next")}
            className="absolute right-4 text-white hover:text-white/80 transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          <div className="max-w-5xl max-h-[85vh] px-16">
            {filteredMedia[currentIndex]?.media_type === "video" ? (
              <video
                src={filteredMedia[currentIndex].media_url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg"
              />
            ) : (
              <img
                src={filteredMedia[currentIndex]?.media_url}
                alt={filteredMedia[currentIndex]?.title}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
            <div className="text-center mt-4 text-white">
              <h3 className="text-xl font-semibold">{filteredMedia[currentIndex]?.title}</h3>
              {filteredMedia[currentIndex]?.description && (
                <p className="text-white/70 mt-1">{filteredMedia[currentIndex].description}</p>
              )}
              <p className="text-white/50 text-sm mt-2">
                {currentIndex + 1} / {filteredMedia.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default Gallery;
