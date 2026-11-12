export type MachineType = "excavator" | "jcb" | "tipper" | "roller" | "other";
export type ReadingType = "hours" | "km";
export type LogStatus = "worked" | "idle" | "breakdown";
export type Lang = "en" | "mr" | "hi";

export interface Machine {
  id: string;
  company_id: string;
  name: string;
  type: MachineType;
  reading_type: ReadingType;
  status: "active" | "inactive";
  current_site_id: string | null;
}

export interface Site {
  id: string;
  name: string;
  location: string | null;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  mobile: string;
  role: "driver" | "owner";
  machine_id: string | null;
  preferred_language: Lang;
}

export interface ShiftLog {
  id: string;
  company_id: string;
  machine_id: string;
  driver_id: string | null;
  site_id: string | null;
  log_date: string;
  opening_reading: number;
  closing_reading: number | null;
  worked: number | null;
  diesel_litres: number;
  status: LogStatus | null;
  start_photo_path: string | null;
  end_photo_path: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
}

export interface Breakdown {
  id: string;
  company_id: string;
  machine_id: string;
  driver_id: string | null;
  reported_at: string;
  photo_path: string | null;
  note: string | null;
  status: "open" | "closed";
}

/** Postgres numeric arrives as a number or string depending on size; normalise. */
export const num = (v: number | string | null | undefined): number => (v == null ? 0 : Number(v));
