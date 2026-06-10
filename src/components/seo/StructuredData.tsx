import { useEffect } from "react";

interface StructuredDataProps {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Injects a JSON-LD <script> into <head>, keyed by id so it can be
 * updated/replaced cleanly on route changes. Multiple instances with
 * different ids stack — schemas are additive per Google guidance.
 */
const StructuredData = ({ id, data }: StructuredDataProps) => {
  useEffect(() => {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [id, data]);

  return null;
};

export default StructuredData;
