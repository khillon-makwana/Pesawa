import type { Metadata } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

// Headings only. Wider and more geometric than Geist, which is what gives the
// document its masthead feel.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Pesawa',
  description: 'Read and reconcile your M-PESA statements'
};

/*
 * Chrome lives in the (site) layout rather than here, so that not-found.tsx and
 * error.tsx — which sit above that group — can compose their own.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
