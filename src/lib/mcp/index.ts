import { defineMcp } from "@lovable.dev/mcp-js";
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
  tools: [clinicInfo, listServices, listDoctors, listAnnouncements],
});
