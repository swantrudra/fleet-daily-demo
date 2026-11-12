/**
 * Seeds the demo company, sites, machines, users and 7 days of shift logs.
 * Run:  npx tsx scripts/seed.ts
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Safe to re-run: it deletes the previous demo data first.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mobileToEmail, pinToPassword } from "../src/lib/auth";
import { addDays, todayIST } from "../src/lib/date";

config({ path: ".env.local", quiet: true });
config({ quiet: true }); // fall back to .env

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const COMPANY_NAME = "Demo Excavation Contractors";
const PIN = "1234";
const OWNER = { name: "Rajesh Deshpande", mobile: "9999999999" };

type MachineType = "excavator" | "jcb" | "tipper" | "roller";
type Lang = "en" | "mr" | "hi";

interface MachineSeed {
  name: string;
  type: MachineType;
  reading: "hours" | "km";
  start: number; // meter reading 8 days ago
  site: 0 | 1;
  driver: { name: string; mobile: string; lang: Lang };
}

const MACHINES: MachineSeed[] = [
  { name: "EX-01", type: "excavator", reading: "hours", start: 5120.5, site: 0, driver: { name: "Santosh Pawar", mobile: "9876500001", lang: "mr" } },
  { name: "EX-02", type: "excavator", reading: "hours", start: 3874.0, site: 0, driver: { name: "Ganesh Jadhav", mobile: "9876500002", lang: "mr" } },
  { name: "EX-03", type: "excavator", reading: "hours", start: 6402.2, site: 1, driver: { name: "Vijay Shinde", mobile: "9876500003", lang: "mr" } },
  { name: "JCB-01", type: "jcb", reading: "hours", start: 2810.0, site: 0, driver: { name: "Sachin More", mobile: "9876500004", lang: "hi" } },
  { name: "JCB-02", type: "jcb", reading: "hours", start: 4155.6, site: 1, driver: { name: "Mahesh Patil", mobile: "9876500005", lang: "mr" } },
  { name: "TP-01", type: "tipper", reading: "km", start: 84213, site: 0, driver: { name: "Dattatray Gaikwad", mobile: "9876500006", lang: "mr" } },
  { name: "TP-02", type: "tipper", reading: "km", start: 61870, site: 0, driver: { name: "Prakash Bhosale", mobile: "9876500007", lang: "hi" } },
  { name: "TP-03", type: "tipper", reading: "km", start: 102455, site: 1, driver: { name: "Sunil Kale", mobile: "9876500008", lang: "mr" } },
  { name: "TP-04", type: "tipper", reading: "km", start: 47390, site: 1, driver: { name: "Anil Deshmukh", mobile: "9876500009", lang: "en" } },
  { name: "RL-01", type: "roller", reading: "hours", start: 1966.4, site: 1, driver: { name: "Balasaheb Chavan", mobile: "9876500010", lang: "mr" } },
];

// Story for the demo (day offsets relative to today; -1 = yesterday)
const MISSING_YESTERDAY = new Set(["TP-03", "RL-01"]);
const IDLE_DAYS: Record<string, number[]> = { "EX-03": [-4], "TP-02": [-2], "RL-01": [-5, -3], "TP-04": [-6] };
const BREAKDOWN = { machine: "JCB-02", day: -1, note: "Hydraulic hose burst on boom cylinder. Oil leaking." };

// Small deterministic random generator so every seed run looks the same.
let state = 42;
function rand(): number {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const between = (min: number, max: number) => min + rand() * (max - min);
const round1 = (n: number) => Math.round(n * 10) / 10;

function dayOfWork(type: MachineType): { worked: number; diesel: number } {
  switch (type) {
    case "excavator": {
      const h = round1(between(6, 10));
      return { worked: h, diesel: Math.round(h * between(12, 16)) }; // ~12–16 L/hr
    }
    case "jcb": {
      const h = round1(between(6, 9.5));
      return { worked: h, diesel: Math.round(h * between(5, 7)) }; // ~5–7 L/hr
    }
    case "roller": {
      const h = round1(between(5, 8));
      return { worked: h, diesel: Math.round(h * between(6, 8)) }; // ~6–8 L/hr
    }
    case "tipper": {
      const km = Math.round(between(60, 180));
      return { worked: km, diesel: Math.round(km / between(3, 4)) }; // ~3–4 km/L
    }
  }
}

function ist(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00+05:30`).toISOString();
}

async function must<T>(label: string, p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) {
    console.error(`✗ ${label}:`, error);
    process.exit(1);
  }
  return data as NonNullable<T>;
}

async function cleanup() {
  // Delete old demo auth users (profiles cascade), then the company (everything else cascades).
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.endsWith("@fleet.local")) await db.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 200) break;
  }
  await must("delete company", db.from("companies").delete().eq("name", COMPANY_NAME));

  // Remove old demo photos (if any)
  const { data: folders } = await db.storage.from("photos").list("", { limit: 1000 });
  for (const f of folders ?? []) {
    const { data: machines } = await db.storage.from("photos").list(f.name, { limit: 1000 });
    for (const m of machines ?? []) {
      const prefix = `${f.name}/${m.name}`;
      const { data: files } = await db.storage.from("photos").list(prefix, { limit: 1000 });
      if (files?.length) await db.storage.from("photos").remove(files.map((x) => `${prefix}/${x.name}`));
    }
  }
}

async function createUser(mobile: string, role: "driver" | "owner") {
  const { data, error } = await db.auth.admin.createUser({
    email: mobileToEmail(mobile),
    password: pinToPassword(PIN),
    email_confirm: true,
    app_metadata: { role }, // read by proxy.ts for routing; RLS uses profiles.role
  });
  if (error || !data.user) {
    console.error(`✗ create user ${mobile}:`, error);
    process.exit(1);
  }
  return data.user.id;
}

async function main() {
  console.log("Cleaning previous demo data…");
  await cleanup();

  console.log("Creating company, sites, machines…");
  const company = await must(
    "company",
    db.from("companies").insert({ name: COMPANY_NAME }).select().single<{ id: string }>(),
  );
  await must("company self id", db.from("companies").update({ company_id: company.id }).eq("id", company.id));

  const sites = await must(
    "sites",
    db
      .from("sites")
      .insert([
        { company_id: company.id, name: "Hinjewadi Site", location: "Hinjewadi Phase 3, Pune" },
        { company_id: company.id, name: "Chakan Site", location: "Chakan MIDC, Pune" },
      ])
      .select("id, name"),
  );
  const siteIds = [sites.find((s) => s.name === "Hinjewadi Site")!.id, sites.find((s) => s.name === "Chakan Site")!.id];

  const machineRows = await must(
    "machines",
    db
      .from("machines")
      .insert(
        MACHINES.map((m) => ({
          company_id: company.id,
          name: m.name,
          type: m.type,
          reading_type: m.reading,
          status: "active",
          current_site_id: siteIds[m.site],
        })),
      )
      .select("id, name"),
  );
  const machineId = (name: string) => machineRows.find((r) => r.name === name)!.id;

  console.log("Creating users…");
  const ownerId = await createUser(OWNER.mobile, "owner");
  await must(
    "owner profile",
    db.from("profiles").insert({
      id: ownerId,
      company_id: company.id,
      full_name: OWNER.name,
      mobile: OWNER.mobile,
      role: "owner",
      preferred_language: "en",
    }),
  );

  const driverIds: Record<string, string> = {};
  for (const m of MACHINES) {
    const id = await createUser(m.driver.mobile, "driver");
    driverIds[m.name] = id;
    await must(
      `driver profile ${m.driver.name}`,
      db.from("profiles").insert({
        id,
        company_id: company.id,
        full_name: m.driver.name,
        mobile: m.driver.mobile,
        role: "driver",
        machine_id: machineId(m.name),
        preferred_language: m.driver.lang,
      }),
    );
  }

  console.log("Creating 7 days of shift logs…");
  const today = todayIST();
  const logs: Record<string, unknown>[] = [];
  const breakdowns: Record<string, unknown>[] = [];

  for (const m of MACHINES) {
    let reading = m.start;
    for (let day = -7; day <= -1; day++) {
      const date = addDays(today, day);
      if (day === -1 && MISSING_YESTERDAY.has(m.name)) continue;

      const idle = IDLE_DAYS[m.name]?.includes(day);
      const isBreakdown = BREAKDOWN.machine === m.name && BREAKDOWN.day === day;
      let { worked, diesel } = dayOfWork(m.type);
      if (idle) {
        worked = 0;
        diesel = 0;
      } else if (isBreakdown) {
        worked = 2.5;
        diesel = 0;
      }

      const opening = reading;
      const closing = m.reading === "km" ? opening + worked : round1(opening + worked);
      reading = closing;

      const endHour = m.reading === "hours" ? Math.min(20, 8 + Math.ceil(worked) + 1) : 18;
      logs.push({
        company_id: company.id,
        machine_id: machineId(m.name),
        driver_id: driverIds[m.name],
        site_id: siteIds[m.site],
        log_date: date,
        opening_reading: opening,
        closing_reading: closing,
        diesel_litres: diesel,
        status: idle ? "idle" : isBreakdown ? "breakdown" : "worked",
        started_at: ist(date, "08:00"),
        ended_at: isBreakdown ? ist(date, "11:00") : ist(date, `${String(endHour).padStart(2, "0")}:00`),
        notes: idle ? "No work at site today" : null,
      });

      if (isBreakdown) {
        breakdowns.push({
          company_id: company.id,
          machine_id: machineId(m.name),
          driver_id: driverIds[m.name],
          reported_at: ist(date, "10:45"),
          note: BREAKDOWN.note,
          status: "open",
        });
      }
    }
  }

  await must("shift_logs", db.from("shift_logs").insert(logs));
  await must("breakdowns", db.from("breakdowns").insert(breakdowns));

  console.log(`\n✓ Seed complete: ${MACHINES.length} machines, ${logs.length} shift logs, ${breakdowns.length} breakdown.\n`);
  console.log("LOGIN CREDENTIALS (PIN for everyone: 1234)");
  console.log("─".repeat(58));
  console.log(`OWNER   ${OWNER.mobile}   ${OWNER.name}`);
  for (const m of MACHINES) {
    console.log(`DRIVER  ${m.driver.mobile}   ${m.driver.name.padEnd(20)} ${m.name}`);
  }
  console.log("─".repeat(58));
  console.log(`Missing yesterday (${addDays(today, -1)}): ${[...MISSING_YESTERDAY].join(", ")}`);
  console.log(`Open breakdown: ${BREAKDOWN.machine}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
