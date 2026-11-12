// DEMO-ONLY LOGIN.
// Users only see "Mobile number" and "PIN". Behind the scenes we use Supabase
// email/password auth with a fake email and a padded password, because a
// 4-digit PIN is shorter than Supabase's minimum password length.
// Real OTP (SMS) login will replace this before production.

export function mobileToEmail(mobile: string): string {
  return `${mobile.replace(/\D/g, "")}@fleet.local`;
}

export function pinToPassword(pin: string): string {
  return `${pin}-fleet`;
}

export type Role = "driver" | "owner";

export function homeFor(role: Role | undefined | null): string {
  return role === "owner" ? "/owner" : "/driver";
}
