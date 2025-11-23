import type { Metadata } from "next";
import "./globals.css";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

export const metadata: Metadata = {
  title: "BetterJob - You Weren't Born to Just Clock In",
  description: "make 10 year old you proud. AI-powered career exploration and job matching in 5 minutes. Find work you'll love, not just tolerate.",
  openGraph: {
    title: "BetterJob - You Weren't Born to Just Clock In",
    description: "make 10 year old you proud. Find work you'll love in 5 minutes.",
    type: "website",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}

