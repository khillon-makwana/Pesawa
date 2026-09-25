import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SiteContainer } from '@/components/site-container';
import { buttonVariants } from '@/components/ui/button';

/*
 * The header and footer are added here rather than inherited: this file sits
 * above the (site) group, so it renders inside the root layout only.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <SiteContainer className="max-w-xl py-24">
          <p className="eyebrow text-muted-foreground">Error 404</p>

          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">
            This page does not exist
          </h1>

          <p className="mt-4 text-muted-foreground">
            The address may be mistyped, or the page may have been removed.
          </p>

          <Link href="/" className={`${buttonVariants()} mt-8`}>
            Open a statement
          </Link>
        </SiteContainer>
      </main>

      <SiteFooter />
    </div>
  );
}
