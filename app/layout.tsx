import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpoCompi - Asistente IA para Policía Nacional",
  description: "Asistente IA, tests y acompañamiento para opositores a Policía Nacional.",
  manifest: "/manifest.webmanifest",
  applicationName: "OpoCompi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpoCompi",
  },
  icons: {
    icon: "/brand/opocompi-logo.png",
    apple: "/brand/opocompi-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3b82",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
                if (isStandalone && window.location.pathname === "/") {
                  window.location.replace("/app");
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
