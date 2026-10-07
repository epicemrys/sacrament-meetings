import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WARD_NAME } from "@/lib/ward";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

// Vercel sets the production domain; local builds fall back to the dev server.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
const siteName = `${WARD_NAME} Sacrament Meetings`;
const siteDescription = `View weekly sacrament meeting programmes, hymns, speakers, and announcements for ${WARD_NAME}.`;

// Site-wide defaults. Pages override title and description; the template brands every title.
// app/opengraph-image.tsx supplies the og:image for every route. Next fills og:title and
// og:description from each page's own title and description.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: `${WARD_NAME} | Sacrament Meetings`, template: `%s | ${WARD_NAME}` },
  description: siteDescription,
  openGraph: { type: "website", siteName },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link no-print">Skip to content</a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}