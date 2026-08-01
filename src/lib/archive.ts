import { supabase } from "@/integrations/supabase/client";

export type ArchiveSource =
  | "patients"
  | "appointments"
  | "treatment_records"
  | "intake_forms"
  | "messages";

export interface SourceConfig {
  key: ArchiveSource;
  label: string;
  /** Columns pulled for the picker list */
  select: string;
  /** Field used for the free-text search */
  searchField: string;
  labelOf: (row: any) => string;
  summaryOf: (row: any) => string;
  patientRefOf: (row: any) => string | null;
  /** Default retention in years if no policy row exists */
  defaultYears: number;
}

export const ARCHIVE_SOURCES: SourceConfig[] = [
  {
    key: "patients",
    label: "Patient files",
    select: "id, full_name, phone, email, date_of_birth, created_at",
    searchField: "full_name",
    labelOf: (r) => r.full_name,
    summaryOf: (r) => [r.phone, r.email].filter(Boolean).join(" · "),
    patientRefOf: (r) => r.id,
    defaultYears: 10,
  },
  {
    key: "appointments",
    label: "Appointments",
    select:
      "id, appointment_date, appointment_time, status, notes, patient_id, patient:patients(full_name)",
    searchField: "status",
    labelOf: (r) =>
      `${r.patient?.full_name || "Unknown patient"} — ${r.appointment_date} ${String(
        r.appointment_time || ""
      ).slice(0, 5)}`,
    summaryOf: (r) => `Status: ${r.status}`,
    patientRefOf: (r) => r.patient_id ?? null,
    defaultYears: 5,
  },
  {
    key: "treatment_records",
    label: "Treatment records",
    select:
      "id, treatment_date, diagnosis, treatment_notes, patient_id, patient:patients(full_name)",
    searchField: "diagnosis",
    labelOf: (r) => `${r.patient?.full_name || "Unknown patient"} — ${r.treatment_date}`,
    summaryOf: (r) => r.diagnosis || "Clinical note",
    patientRefOf: (r) => r.patient_id ?? null,
    defaultYears: 10,
  },
  {
    key: "intake_forms",
    label: "Intake & consent forms",
    select: "id, form_type, submitted_at, patient_id, patient:patients(full_name)",
    searchField: "form_type",
    labelOf: (r) => `${r.patient?.full_name || "Unknown patient"} — ${r.form_type}`,
    summaryOf: (r) => `Submitted ${new Date(r.submitted_at).toLocaleDateString()}`,
    patientRefOf: (r) => r.patient_id ?? null,
    defaultYears: 10,
  },
  {
    key: "messages",
    label: "Correspondence",
    select: "id, full_name, subject, message, created_at",
    searchField: "subject",
    labelOf: (r) => `${r.full_name} — ${r.subject}`,
    summaryOf: (r) => String(r.message || "").slice(0, 120),
    patientRefOf: () => null,
    defaultYears: 2,
  },
];

export const sourceConfig = (key: string) =>
  ARCHIVE_SOURCES.find((s) => s.key === key) ?? ARCHIVE_SOURCES[0];

/** SHA-256 hex digest — tamper evidence for archived snapshots and backups. */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Retention expiry: last activity + policy years, extended for minors until `minor_until_age`. */
export function computeRetentionUntil(
  from: Date,
  years: number,
  dateOfBirth?: string | null,
  minorUntilAge?: number | null
): string {
  const base = new Date(from);
  base.setFullYear(base.getFullYear() + years);

  if (dateOfBirth && minorUntilAge) {
    const dob = new Date(dateOfBirth);
    const ageOut = new Date(dob);
    ageOut.setFullYear(dob.getFullYear() + minorUntilAge);
    if (ageOut > base) return ageOut.toISOString().slice(0, 10);
  }
  return base.toISOString().slice(0, 10);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

/** Writes an entry to the tamper-evident activity log. Never blocks the caller. */
export async function logArchiveActivity(
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, any>
) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: data.user?.id ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch {
    /* logging must never break the workflow */
  }
}
