import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { SiteContainer } from '@/components/site-container';

/*
 * Nav items are links, so they get the button's look from buttonVariants
 * rather than being rendered as buttons — an anchor that navigates should
 * stay an anchor.
 */
const NAV_LINK = buttonVariants({ variant: 'ghost', size: 'sm' });

export function SiteHeader() {
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

        <nav className="flex items-center gap-1 text-sm">
          <Link href="/privacy" className={NAV_LINK}>
            Privacy
          </Link>
        </nav>
      </SiteContainer>
    </header>
  );
}
