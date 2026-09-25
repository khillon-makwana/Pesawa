'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { SiteContainer } from '@/components/site-container';

interface SiteHeaderProps {
  userEmail: string | null;
}

/*
 * Nav items are links, so they get the button's look from buttonVariants
 * rather than being rendered as buttons — an anchor that navigates should
 * stay an anchor.
 */
const NAV_LINK = buttonVariants({ variant: 'ghost', size: 'sm' });

export function SiteHeader({ userEmail }: SiteHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-background">
      <SiteContainer className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
        >
          <span aria-hidden className="text-[0.6em] text-primary">
            ■
          </span>
          Pesawa
        </Link>

        {/*
          Below `sm` there is only room for the wordmark and one or two
          controls, so the secondary links drop out here and are carried by the
          footer instead.
        */}
        <nav className="flex items-center gap-1 text-sm">
          {/*
            Wrapped rather than hidden individually: `hidden` on the link itself
            would collide with the `inline-flex` that buttonVariants brings, and
            which of the two wins would come down to stylesheet order.
          */}
          <span className="hidden items-center gap-1 sm:flex">
            <Link href="/statements" className={NAV_LINK}>
              Ledger
            </Link>
            <Link href="/privacy" className={NAV_LINK}>
              Privacy
            </Link>
          </span>

          {userEmail === null ? (
            <>
              <Link href="/login" className={NAV_LINK}>
                Sign in
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Create account
              </Link>
            </>
          ) : (
            <>
              <span className="sm:hidden">
                <Link href="/statements" className={NAV_LINK}>
                  Ledger
                </Link>
              </span>
              <span
                className="hidden max-w-[18ch] truncate px-2 text-xs text-muted-foreground lg:block"
                title={userEmail}
              >
                {userEmail}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign out
              </Button>
            </>
          )}

          <span
            aria-hidden
            className="ml-1 hidden size-9 items-center justify-center rounded-full bg-primary text-primary-foreground sm:flex"
          >
            <PersonGlyph />
          </span>
        </nav>
      </SiteContainer>
    </header>
  );
}

function PersonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}
