'use client'; // Error boundaries must be Client Components.

import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SiteContainer } from '@/components/site-container';
import { Button, buttonVariants } from '@/components/ui/button';

/*
 * Nothing from the error object is shown. Its message can carry details of
 * whatever failed, and a statement screen is the last place to print those.
 *
 * `retry` re-renders this boundary's contents. It replaced `reset` as the
 * recommended prop in Next 16.3: `reset` only clears the error state, while
 * `retry` also re-runs the work that failed, which is what "Try again" means.
 */
export default function ErrorPage({
  retry
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <SiteContainer className="max-w-xl py-24">
          <p className="eyebrow text-destructive">Something went wrong</p>

          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">
            This page could not be shown
          </h1>

          <p className="mt-4 text-muted-foreground">
            Your statement was not sent anywhere, and nothing saved in this browser has
            been changed. Trying again usually works.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => retry()}>Try again</Button>

            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              Go home
            </Link>
          </div>
        </SiteContainer>
      </main>

      <SiteFooter />
    </div>
  );
}
