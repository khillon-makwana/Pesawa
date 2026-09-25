import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import {
  findStatementForUser,
  listTransactionsForStatement,
  listIssuesForStatement
} from '@/server/services/statement-queries';
import { DeleteStatementButton } from '@/components/delete-statement-button';
import type { Transaction } from '@/lib/parser/types';
import Link from 'next/link';
import { StatementReport } from '@/components/statement/statement-report';
import { SiteContainer } from '@/components/site-container';

export default async function StatementDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (user === null) {
    redirect('/login');
  }

  const { id } = await params;
  const statement = await findStatementForUser(user.id, id);

  // Scoped by user, so another user's statement is simply not found.
  if (statement === null) {
    notFound();
  }

  const [transactions, issues] = await Promise.all([
    listTransactionsForStatement(user.id, id),
    listIssuesForStatement(user.id, id)
  ]);
  // Stored rows carry a Date and extra database columns. The component expects
  // the parser's Transaction shape, so convert once here rather than making the
  // component aware of two shapes.
  const parsedTransactions: Transaction[] = transactions.map(row => ({
    receiptNo: row.receiptNo,
    completedAt: row.completedAt.toISOString(),
    detailsRaw: row.detailsRaw,
    type: row.type as Transaction['type'],
    direction: row.direction as Transaction['direction'],
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    isRevenue: row.isRevenue,
    counterpartyName: row.counterpartyName,
    counterpartyPhone: row.counterpartyPhone,
    chargeForReceipt: row.chargeForReceipt,
    reversesReceipt: row.reversesReceipt,
    confidence: row.confidence as Transaction['confidence'],
    sourcePage: row.sourcePage
  }));

  return (
    <SiteContainer>
      <StatementReport
        heading={statement.fileName}
        meta={{
          periodStart: statement.periodStart,
          periodEnd: statement.periodEnd,
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          balanceVerified: statement.balanceVerified
        }}
        transactions={parsedTransactions}
        issues={issues}
        above={
          <Link
            href="/statements"
            className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
          >
            ← All statements
          </Link>
        }
        actions={<DeleteStatementButton statementId={statement.id} />}
      />
    </SiteContainer>
  );
}
