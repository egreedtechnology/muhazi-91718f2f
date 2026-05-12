import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  full_name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
  appointment_date?: string;
  appointment_time?: string;
  duration_minutes?: number;
};

const isStr = (v: unknown, max: number, min = 1) =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;

    // Server-side validation
    if (!isStr(body.full_name, 100)) return bad("Invalid name");
    if (!isStr(body.phone, 30)) return bad("Invalid phone");
    if (body.email != null && body.email !== "" && !isStr(body.email, 255)) return bad("Invalid email");
    if (!body.appointment_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.appointment_date))
      return bad("Invalid date");
    if (!body.appointment_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.appointment_time))
      return bad("Invalid time");
    const duration =
      typeof body.duration_minutes === "number" && body.duration_minutes > 0 && body.duration_minutes <= 240
        ? body.duration_minutes
        : 30;
    if (body.notes != null && typeof body.notes === "string" && body.notes.length > 1000)
      return bad("Notes too long");

    const fullName = body.full_name!.trim();
    const phone = body.phone!.trim();
    const email = body.email ? body.email.trim() : null;
    const notes = body.notes ? body.notes.trim() : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find or create patient by phone
    const { data: existing, error: findErr } = await supabase
      .from("patients")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (findErr) throw findErr;

    let patientId = existing?.id;
    if (!patientId) {
      const { data: created, error: insErr } = await supabase
        .from("patients")
        .insert({ full_name: fullName, phone, email })
        .select("id")
        .single();
      if (insErr) throw insErr;
      patientId = created.id;
    }

    // Prevent double-booking the exact slot
    const { data: clash } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", body.appointment_date)
      .eq("appointment_time", body.appointment_time)
      .neq("status", "cancelled")
      .maybeSingle();
    if (clash) return bad("That time slot is already booked", 409);

    const { error: apptErr } = await supabase.from("appointments").insert({
      patient_id: patientId,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      duration_minutes: duration,
      notes,
      status: "pending",
    });
    if (apptErr) throw apptErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
