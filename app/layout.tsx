import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/PwaRegister";
import "@fontsource-variable/space-grotesk/index.css";
import "@fontsource/azeret-mono/400.css";
import "@fontsource/azeret-mono/500.css";
import "@fontsource/azeret-mono/600.css";
import "@fontsource/azeret-mono/700.css";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "NEXSTEP — Mobile IT Diagnostics",
  description: "Geführte IT-Fehlerdiagnose für Azubis und Junior-Admins.",
  applicationName: "NEXSTEP",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEXSTEP",
  },
  icons: {
    icon: `${basePath}/icons/icon.svg`,
    apple: `${basePath}/icons/icon-180.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071c1a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
