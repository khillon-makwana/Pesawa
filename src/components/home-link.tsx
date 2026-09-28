'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/*
 * A link to the home page that always lands on a fresh upload screen.
 *
 * The home page shows a statement report without changing the URL, so while a
 * report is on screen you are still on "/". An ordinary link to "/" would then
 * be a navigation to the page you are already on, and Next keeps the page's
 * state across that — the report would stay put. So when already home, this
 * reloads the page instead.
 *
 * Reloading also drops the statement from memory, which is what "go home"
 * should mean for a statement you chose not to save.
 */
export function HomeLink({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className={className}
      onClick={event => {
        if (pathname === '/') {
          event.preventDefault();
          window.location.reload();
        }
      }}
    >
      {children}
    </Link>
  );
}
