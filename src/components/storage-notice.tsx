/**
 * Shown when IndexedDB could not be opened, which is what private browsing
 * does in some browsers. Saving still works for the rest of the visit, so the
 * wording promises exactly that and nothing more.
 */
export function SessionOnlyNotice({ className }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground ${className ?? ''}`}
    >
      <span className="font-medium text-foreground">
        This browser will not let Pesawa store anything.
      </span>{' '}
      Private browsing usually causes this. Statements you save are kept for this visit
      only and are gone when you close the tab. Export a backup if you want to keep them.
    </p>
  );
}
