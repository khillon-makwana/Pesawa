import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import { listStatementsForUser } from '@/server/services/statement-queries';

function formatCents(cents: number) {
  return `KSh ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

export default async function StatementsPage() {
  const user = await getAuthenticatedUser();

  if (user === null) {
    redirect('/login');
  }

  const statements = await listStatementsForUser(user.id);

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 900 }}>
      <h1>Your statements</h1>

      {statements.length === 0 ? (
        <p>
          No statements yet. <Link href="/">Upload one</Link>.
        </p>
      ) : (
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>File</th>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>Rows</th>
              <th style={{ textAlign: 'right' }}>Closing</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {statements.map(statement => (
              <tr key={statement.id}>
                <td>
                  <Link href={`/statements/${statement.id}`}>{statement.fileName}</Link>
                </td>
                <td>
                  {statement.periodStart.slice(0, 10)} – {statement.periodEnd.slice(0, 10)}
                </td>
                <td style={{ textAlign: 'right' }}>{statement.rowCount}</td>
                <td style={{ textAlign: 'right' }}>{formatCents(statement.closingBalance)}</td>
                <td>{statement.balanceVerified ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}