import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "clinic_info",
  title: "Muhazi Dental Clinic info",
  description: "Return contact, location, and working hours for Muhazi Dental Clinic.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const info = {
      name: "Muhazi Dental Clinic",
      location: "Rwamagana, Rwanda",
      phone: "+250 787 630 399",
      website: "https://muhazi.lovable.app",
      hours: "Open daily 8:00 AM – 8:00 PM",
      booking_url: "https://muhazi.lovable.app/book",
      languages: ["English", "Kinyarwanda", "French"],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info) }],
      structuredContent: info,
    };
  },
});
