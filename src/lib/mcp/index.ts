declare const process: { env: Record<string, string | undefined> };
import { defineMcp, auth } from "@lovable.dev/mcp-js";
import listServices from "./tools/list-services";
import listDoctors from "./tools/list-doctors";
import listAnnouncements from "./tools/list-announcements";
import clinicInfo from "./tools/clinic-info";

export default defineMcp({
  name: "muhazi-dental-mcp",
  title: "Muhazi Dental Clinic",
  version: "0.1.0",
  instructions:
    "Tools for Muhazi Dental Clinic. Use `clinic_info` for hours/contact, `list_services` for clinical services, `list_doctors` for dentists, and `list_announcements` for current notices.",
  auth: auth.oauth.issuer({
    issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    acceptedAudiences: ["authenticated"],
    resourceName: "Muhazi Dental Clinic MCP",
  }),
  tools: [clinicInfo, listServices, listDoctors, listAnnouncements],
});

