/**
 * Shared class strings for form controls, so the auth pages cannot drift apart.
 * These get replaced once shadcn's Input and Button components are in use.
 */

export const LABEL = 'block text-sm font-medium';

export const INPUT =
  'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const PRIMARY_BUTTON =
  'cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';