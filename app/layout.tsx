import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { TENANT_CONFIG } from "@/lib/config/tenant";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: TENANT_CONFIG.metatags.titulo,
    template: `%s · ${TENANT_CONFIG.nome}`,
  },
  description: TENANT_CONFIG.metatags.descricao,
  openGraph: {
    title: TENANT_CONFIG.metatags.titulo,
    description: TENANT_CONFIG.metatags.descricao,
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#050403",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          richColors
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
