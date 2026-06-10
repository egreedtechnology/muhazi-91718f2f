import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = "https://muhazidentalclinic.org/mdc-logo.jpg",
  ogImageAlt = "Muhazi Dental Clinic — trusted dental care in Rwamagana, Rwanda",
  keywords = "dental clinic, dentist, Rwamagana, Rwanda, teeth cleaning, dental care, root canal, teeth whitening, dental implants, eGreed Technology",
  type = "website",
  publishedTime,
  modifiedTime,
  section,
  tags,
}: SEOHeadProps) => {
  const fullTitle = title.includes("Muhazi") ? title : `${title} | Muhazi Dental Clinic`;
  const siteUrl = "https://muhazidentalclinic.org";
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;

  useEffect(() => {
    document.title = fullTitle;

    const updateMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement("meta");
        if (property) element.setAttribute("property", name);
        else element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // Core
    updateMeta("description", description);
    updateMeta("keywords", keywords);
    updateMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    updateMeta("author", "Muhazi Dental Clinic");
    updateMeta("publisher", "Muhazi Dental Clinic");
    updateMeta("developer", "eGreed Technology — https://egreedtech.org");
    updateMeta("designer", "eGreed Technology");
    updateMeta("geo.region", "RW-02");
    updateMeta("geo.placename", "Rwamagana");
    updateMeta("geo.position", "-1.9486;30.4347");
    updateMeta("ICBM", "-1.9486, 30.4347");

    // OpenGraph
    updateMeta("og:title", fullTitle, true);
    updateMeta("og:description", description, true);
    updateMeta("og:url", canonicalUrl, true);
    updateMeta("og:image", ogImage, true);
    updateMeta("og:image:alt", ogImageAlt, true);
    updateMeta("og:image:width", "1200", true);
    updateMeta("og:image:height", "630", true);
    updateMeta("og:image:type", "image/jpeg", true);
    updateMeta("og:type", type, true);
    updateMeta("og:site_name", "Muhazi Dental Clinic", true);
    updateMeta("og:locale", "en_RW", true);
    updateMeta("og:locale:alternate", "rw_RW", true);
    updateMeta("og:locale:alternate", "fr_RW", true);

    // Article extras
    if (type === "article") {
      if (publishedTime) updateMeta("article:published_time", publishedTime, true);
      if (modifiedTime) updateMeta("article:modified_time", modifiedTime, true);
      if (section) updateMeta("article:section", section, true);
      updateMeta("article:publisher", "https://muhazidentalclinic.org", true);
      updateMeta("article:author", "Muhazi Dental Clinic", true);
      if (tags && tags.length) {
        // Clear any prior article:tag entries to avoid stale duplicates
        document.querySelectorAll('meta[property="article:tag"]').forEach((n) => n.remove());
        tags.forEach((t) => {
          const m = document.createElement("meta");
          m.setAttribute("property", "article:tag");
          m.setAttribute("content", t);
          document.head.appendChild(m);
        });
      }
    }

    // Twitter
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", ogImage);
    updateMeta("twitter:image:alt", ogImageAlt);
    updateMeta("twitter:site", "@muhazidc");
    updateMeta("twitter:creator", "@muhazidc");
    updateMeta("twitter:domain", "muhazidentalclinic.org");
    updateMeta("twitter:url", canonicalUrl);
    updateMeta("twitter:label1", "Location");
    updateMeta("twitter:data1", "Rwamagana, Rwanda");
    updateMeta("twitter:label2", "Hours");
    updateMeta("twitter:data2", "Mon–Sun · 8AM–8PM");

    // Mobile / theme
    updateMeta("theme-color", "#0d9488");
    updateMeta("apple-mobile-web-app-title", "Muhazi Dental");
    updateMeta("application-name", "Muhazi Dental Clinic");

    // BreadcrumbList structured data for inner pages
    if (canonical && canonical !== "/") {
      const breadcrumbId = "seo-breadcrumb-ld";
      let breadcrumbScript = document.getElementById(breadcrumbId) as HTMLScriptElement;
      if (!breadcrumbScript) {
        breadcrumbScript = document.createElement("script");
        breadcrumbScript.id = breadcrumbId;
        breadcrumbScript.type = "application/ld+json";
        document.head.appendChild(breadcrumbScript);
      }
      const pageName = title.split("|")[0].trim();
      breadcrumbScript.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
          { "@type": "ListItem", "position": 2, "name": pageName, "item": canonicalUrl },
        ],
      });
    }
  }, [
    fullTitle,
    description,
    canonicalUrl,
    ogImage,
    ogImageAlt,
    keywords,
    type,
    canonical,
    publishedTime,
    modifiedTime,
    section,
    tags,
  ]);

  return null;
};

export default SEOHead;
