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

export const metadata: Metadata = {
  title: { default: `${WARD_NAME} | Sacrament Meetings`, template: `%s | ${WARD_NAME}` },
  description: "View weekly sacrament meeting programmes, hymns, speakers, and announcements for " + WARD_NAME + ".",
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