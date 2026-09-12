import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import {
  findStatementForUser,
  listTransactionsForStatement,
  listIssuesForStatement
} from '@/server/services/statement-queries';
import { DeleteStatementButton } from '@/components/delete-statement-button';
import { TransactionList } from '@/components/statement/transaction-list';
import type { Transaction } from '@/lib/parser/types';
import Link from 'next/link';
import { formatKsh } from '@/components/statement/format';
import { ChargesPanel } from '@/components/statement/charges-panel';
import { MoneyFlowPanel } from '@/components/statement/money-flow-panel';
import { CounterpartiesPanel } from '@/components/statement/counterparties-panel';
import { TimingPanel } from '@/components/statement/timing-panel';

function formatCents(cents: number) {
  return `KSh ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

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
    <div className="space-y-6">
      <div>
        <Link
          href="/statements"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← All statements
        </Link>

        <h1 className="mt-2 truncate text-2xl font-semibold">{statement.fileName}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          <span className="tabular">{transactions.length}</span> transactions · Opening{' '}
          <span className="tabular">{formatKsh(statement.openingBalance)}</span> · Closing{' '}
          <span className="tabular">{formatKsh(statement.closingBalance)}</span> · Balance{' '}
          {statement.balanceVerified ? 'verified' : 'not verified'}
        </p>
      </div>

      <DeleteStatementButton statementId={statement.id} />

      {issues.length > 0 && (
        <section className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-4">
          <h2 className="text-sm font-medium">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found in this statement
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {issues.map(issue => (
              <li key={issue.id}>{issue.detail}</li>
            ))}
          </ul>
        </section>
      )}

      <ChargesPanel transactions={parsedTransactions} />
      <MoneyFlowPanel transactions={parsedTransactions} />
      <CounterpartiesPanel transactions={parsedTransactions} />
      <TimingPanel transactions={parsedTransactions} />

      <TransactionList transactions={parsedTransactions} />
    </div>
  );
}