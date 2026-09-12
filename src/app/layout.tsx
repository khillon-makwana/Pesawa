import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import { SiteHeader } from '@/components/site-header';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pesawa",
  description: "Read and reconcile your M-PESA statements",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getAuthenticatedUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans antialiased">
        <SiteHeader userEmail={user?.email ?? null} />
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}