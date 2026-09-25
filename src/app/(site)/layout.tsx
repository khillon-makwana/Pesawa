import type { ReactNode } from 'react';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/*
 * Everything except the auth screens. The container is applied per page rather
 * than here, so a page can run a section full-bleed (the home statistics band)
 * while the rest of it stays aligned.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader userEmail={user?.email ?? null} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
