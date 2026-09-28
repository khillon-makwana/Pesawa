import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { StatementSessionProvider } from '@/components/statement-session';

/*
 * The container is applied per page rather than here, so a page can run a
 * section full-bleed (the home statistics band) while the rest of it stays
 * aligned.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    // The provider wraps the header too, because the logo uses it.
    <StatementSessionProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </StatementSessionProvider>
  );
}
