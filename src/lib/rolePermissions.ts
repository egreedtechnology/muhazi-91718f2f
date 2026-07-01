export type AppRole =
  | "super_admin"
  | "manager"
  | "receptionist"
  | "dentist"
  | "dental_assistant"
  | "accountant"
  | "it_admin"
  | "cashier"
  | "lab_technician"
  | "pharmacist"
  | "nurse"
  | "cleaner"
  | "security_guard";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Administrator",
  manager: "Manager",
  receptionist: "Receptionist",
  dentist: "Dentist",
  dental_assistant: "Dental Assistant",
  accountant: "Accountant",
  it_admin: "IT Administrator",
  cashier: "Cashier",
  lab_technician: "Laboratory Technician",
  pharmacist: "Pharmacist",
  nurse: "Nurse",
  cleaner: "Cleaner",
  security_guard: "Security Guard",
};

export const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as AppRole[]).map((v) => ({
  value: v,
  label: ROLE_LABELS[v],
}));

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: ["Full system access", "Manage staff & roles", "Manage clinic settings", "View audit logs"],
  manager: ["Manage staff accounts", "Assign roles", "View reports", "Manage appointments & doctors"],
  receptionist: ["Manage appointments", "Manage patients", "Handle messages & inbox"],
  dentist: ["View assigned patients", "Manage treatments & prescriptions", "View schedule"],
  dental_assistant: ["Support dentists", "Update treatment notes", "Manage supplies"],
  accountant: ["View invoices & payments", "Financial reports"],
  it_admin: ["System settings", "User accounts", "Backups & logs"],
  cashier: ["Process payments", "Issue receipts"],
  lab_technician: ["Manage lab work orders", "Update sample status"],
  pharmacist: ["Dispense prescriptions", "Manage medication inventory"],
  nurse: ["Assist appointments", "Vitals & triage notes"],
  cleaner: ["Facility checklist access"],
  security_guard: ["Visitor logs", "Facility access"],
};

export const STATUS_META: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  active: { label: "Active", dot: "bg-green-500", badge: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending: { label: "Pending Invitation", dot: "bg-yellow-500", badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  suspended: { label: "Suspended", dot: "bg-red-500", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
  disabled: { label: "Disabled", dot: "bg-gray-500", badge: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};
