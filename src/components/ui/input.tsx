import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/*
 * Replaces the INPUT class-string constant that the auth pages shared. Base
 * text size stays at 16px so iOS Safari does not zoom the page on focus.
 */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'block h-11 w-full rounded-md border border-input bg-muted/50 px-3 text-base transition-colors',
        'placeholder:font-mono placeholder:text-sm placeholder:text-muted-foreground/70',
        'focus-visible:border-ring focus-visible:bg-card focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

/* The label above it — small, uppercase, in the document's monospace voice. */
export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('block text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
}
