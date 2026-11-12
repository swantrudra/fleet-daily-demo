import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Daily",
  description: "Daily machine readings for excavation fleets",
  applicationName: "Fleet Daily",
  appleWebApp: { capable: true, title: "Fleet Daily", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-100 shadow-xl">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  );
}
