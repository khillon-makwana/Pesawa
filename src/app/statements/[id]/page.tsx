import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import {
  findStatementForUser,
  listTransactionsForStatement,
  listIssuesForStatement
} from '@/server/services/statement-queries';
import { DeleteStatementButton } from '@/components/delete-statement-button';


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

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 900 }}>
      <h1>{statement.fileName}</h1>
      <p style={{ fontSize: 14, color: '#555' }}>
        {transactions.length} transactions · Opening {formatCents(statement.openingBalance)} ·
        Closing {formatCents(statement.closingBalance)} · Balance{' '}
        {statement.balanceVerified ? 'verified' : 'not verified'}
      </p>

        <div style={{ margin: '16px 0' }}>
            <DeleteStatementButton statementId={statement.id} />
        </div>

      {issues.length > 0 && (
        <>
          <h3>Issues ({issues.length})</h3>
          <ul style={{ fontSize: 13 }}>
            {issues.map(issue => (
              <li key={issue.id}>
                [{issue.type}] {issue.detail}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Transactions</h3>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Date</th>
            <th>Type</th>
            <th>Counterparty</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={transaction.id}>
              <td>{transaction.completedAt.toLocaleString('en-KE')}</td>
              <td>
                {transaction.type}
                {transaction.confidence === 'low' && ' ⚠'}
              </td>
              <td>
                {transaction.type === 'charge' && transaction.chargeForReceipt
                  ? `Fee for ${transaction.chargeForReceipt}`
                  : transaction.counterpartyName ?? '—'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {transaction.direction === 'in' ? '+' : '−'}
                {formatCents(transaction.amount)}
              </td>
              <td style={{ textAlign: 'right' }}>{formatCents(transaction.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}