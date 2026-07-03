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

// Where a staff member should land after signing in, based on their strongest role.
const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  it_admin: "/admin/dashboard",
  receptionist: "/admin/appointments",
  dentist: "/admin/calendar",
  dental_assistant: "/admin/calendar",
  nurse: "/admin/calendar",
  accountant: "/admin/dashboard",
  cashier: "/admin/dashboard",
  lab_technician: "/admin/dashboard",
  pharmacist: "/admin/dashboard",
  cleaner: "/admin/dashboard",
  security_guard: "/admin/dashboard",
};

const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "manager",
  "it_admin",
  "dentist",
  "receptionist",
  "dental_assistant",
  "nurse",
  "accountant",
  "cashier",
  "lab_technician",
  "pharmacist",
  "cleaner",
  "security_guard",
];

export function dashboardForRoles(roles: AppRole[] | string[] | null | undefined): string {
  if (!roles || roles.length === 0) return "/admin/dashboard";
  const set = new Set(roles as AppRole[]);
  for (const r of ROLE_PRIORITY) if (set.has(r)) return ROLE_HOME[r];
  return "/admin/dashboard";
}

// Password strength scoring — returns { score 0-4, label, hints[] }
export function scorePassword(pw: string) {
  const checks = {
    length: pw.length >= 8,
    long: pw.length >= 12,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  let score = 0;
  if (checks.length) score++;
  if (checks.lower && checks.upper) score++;
  if (checks.number) score++;
  if (checks.symbol) score++;
  if (checks.long && score >= 3) score = 4;
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];
  const hints: string[] = [];
  if (!checks.length) hints.push("At least 8 characters");
  if (!checks.upper) hints.push("An uppercase letter");
  if (!checks.lower) hints.push("A lowercase letter");
  if (!checks.number) hints.push("A number");
  if (!checks.symbol) hints.push("A symbol (e.g. !@#$)");
  return { score, label: labels[score], hints, checks };
}
