import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import { listStatementsForUser } from '@/server/services/statement-queries';
import { SiteContainer } from '@/components/site-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatKsh } from '@/components/statement/format';

export default async function StatementsPage() {
  const user = await getAuthenticatedUser();

  if (user === null) {
    redirect('/login');
  }

  const statements = await listStatementsForUser(user.id);

  return (
    <SiteContainer>
      <main className="py-8">
        <p className="eyebrow text-muted-foreground">Saved statements</p>
        <h1 className="mt-2 flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
          <span aria-hidden className="text-[0.5em] text-primary">
            ■
          </span>
          Your ledger
        </h1>

        {statements.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <p className="font-medium">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Open a statement and choose “Save this statement” to keep its parsed
              transactions here.
            </p>
            <Link href="/" className={`${buttonVariants()} mt-6`}>
              Open a statement
            </Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-left text-primary-foreground">
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    File
                  </th>
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    Period
                  </th>
                  <th className="eyebrow px-4 py-3 text-right font-normal text-primary-foreground/70">
                    Rows
                  </th>
                  <th className="eyebrow px-4 py-3 text-right font-normal text-primary-foreground/70">
                    Closing
                  </th>
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statements.map(statement => (
                  <tr key={statement.id} className="transition-colors hover:bg-muted/50">
                    <td className="max-w-[280px] px-4 py-3">
                      <Link
                        href={`/statements/${statement.id}`}
                        className="block truncate font-medium underline-offset-4 hover:underline"
                      >
                        {statement.fileName}
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {statement.periodStart.slice(0, 10)} – {statement.periodEnd.slice(0, 10)}
                    </td>
                    <td className="tabular px-4 py-3 text-right">{statement.rowCount}</td>
                    <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                      {formatKsh(statement.closingBalance)}
                    </td>
                    <td className="px-4 py-3">
                      {statement.balanceVerified ? (
                        <Badge variant="money-in">Verified</Badge>
                      ) : (
                        <Badge variant="charge">Not verified</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </SiteContainer>
  );
}
