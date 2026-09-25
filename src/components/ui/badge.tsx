import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

/*
 * The small uppercase monospace pill used for transaction types, statuses and
 * the eyebrow tags. Geometry comes from the `.chip` utility in globals.css so
 * that every pill in the app is the same size; only colour varies here.
 */
const badgeVariants = cva('chip border border-transparent font-medium', {
  variants: {
    variant: {
      default: 'bg-muted text-muted-foreground',
      /* Incoming money. Paired with a sign or an explicit word, never colour alone. */
      'money-in': 'bg-[var(--color-money-in)]/12 text-[var(--color-money-in)]',
      /* Charges, matching the orange they are given everywhere else. */
      charge: 'bg-accent/12 text-accent',
      outline: 'border-border text-foreground',
      /* For pills sitting on --surface-dark or --surface-deep. */
      inverted: 'bg-white/10 text-primary-foreground'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className)
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant
    }
  });
}

export { Badge, badgeVariants };
