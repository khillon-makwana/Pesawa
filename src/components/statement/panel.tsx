import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * The shell every analysis panel sits in: a white card with a monospace
 * uppercase title and an optional right-hand note, separated by a hairline.
 * Previously each panel hand-rolled `rounded-lg border bg-card p-6`.
 */
export function Panel({
  title,
  aside,
  subtitle,
  children,
  className
}: {
  title: string;
  aside?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
        <h3 className="eyebrow text-muted-foreground">{title}</h3>
        {aside !== undefined && (
          <div className="eyebrow shrink-0 text-muted-foreground">{aside}</div>
        )}
      </div>

      <div className="px-5 py-5">
        {subtitle !== undefined && (
          <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
    </section>
  );
}
