import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * The single measure every page aligns to. It is applied per page rather than
 * in the layout so that a section can break out to full width — the home
 * statistics band does — without fighting a wrapper.
 */
export function SiteContainer({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
