import type { ParseIssue } from '@/lib/parser/types';
import { explainIssues, type IssueExplanation } from './explain-issue';

/*
 * Issues split in two. Anything that means money may be missing or misread is
 * shown open and in the warning colour; notes that mean nothing is wrong sit
 * quietly underneath, collapsed. Showing both the same way — as this screen
 * used to — made a skipped Failed row look as alarming as a missing payment.
 */
export function IssuesPanel({ issues }: { issues: ParseIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  const explanations = explainIssues(issues);
  const explained = issues.map((issue, index) => ({ issue, ...explanations[index] }));
  const needingAttention = explained.filter(item => item.severity === 'attention');
  const notes = explained.filter(item => item.severity === 'info');

  return (
    <div className="space-y-3">
      {needingAttention.length > 0 && (
        <section className="rounded-lg border border-accent/40 bg-accent/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="text-accent">
              ▲
            </span>
            {needingAttention.length}{' '}
            {needingAttention.length === 1 ? 'thing needs' : 'things need'} your attention
          </h2>
          <IssueList items={needingAttention} />
        </section>
      )}

      {notes.length > 0 && (
        <details className="rounded-lg border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} about how this
            statement was read — nothing is wrong
          </summary>
          <IssueList items={notes} />
        </details>
      )}
    </div>
  );
}

function IssueList({ items }: { items: (IssueExplanation & { issue: ParseIssue })[] }) {
  return (
    <ul className="mt-3 space-y-4">
      {items.map(({ issue, headline, explanation }, index) => (
        <li key={index} className="text-sm">
          <p className="font-medium text-foreground">{headline}</p>
          <p className="mt-1 text-muted-foreground">{explanation}</p>

          {/*
            The parser's own wording, kept for anyone reporting a bug. It is
            the same text as the issues CSV, so nothing here is new.
          */}
          <details className="mt-1.5">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Technical detail
            </summary>
            <p className="tabular mt-1 font-mono text-xs text-muted-foreground">
              {issue.detail}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
