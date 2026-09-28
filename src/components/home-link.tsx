'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionalStatementSession } from '@/components/statement-session';

/*
 * A link to the home page that always lands on the first upload screen.
 *
 * From any other page it is an ordinary link. On the home page itself it is
 * not: the password prompt and error message are states of "/" rather than
 * pages of their own, so a link to "/" would go nowhere. There it restarts
 * the upload screen instead, which drops any chosen file and typed code.
 */
export function HomeLink({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const session = useOptionalStatementSession();

  return (
    <Link
      href="/"
      className={className}
      onClick={event => {
        if (pathname === '/' && session !== null) {
          event.preventDefault();
          session.restartUploadScreen();
        }
      }}
    >
      {children}
    </Link>
  );
}
