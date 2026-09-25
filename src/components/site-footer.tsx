import Link from 'next/link';
import { SiteContainer } from '@/components/site-container';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <SiteContainer className="flex flex-col gap-4 py-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden className="text-primary">
            ■
          </span>
          Pesawa financial audit &amp; ledger parser
        </p>

        <nav className="flex items-center gap-4">
          <Link href="/saved" className="eyebrow transition-colors hover:text-foreground">
            Saved
          </Link>
          <Link href="/privacy" className="eyebrow transition-colors hover:text-foreground">
            Privacy
          </Link>
          <span className="eyebrow">© {new Date().getFullYear()} Pesawa</span>
        </nav>
      </SiteContainer>
    </footer>
  );
}
