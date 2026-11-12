import { redirect } from "next/navigation";

// proxy.ts redirects "/" by role; this is only a fallback.
export default function Home() {
  redirect("/login");
}
