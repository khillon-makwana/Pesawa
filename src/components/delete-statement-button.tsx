'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteStatementButton({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    await fetch(`/api/statements/${statementId}`, { method: 'DELETE' });

    router.push('/statements');
    router.refresh();
  }

  if (!isConfirming) {
    return (
      <button onClick={() => setIsConfirming(true)} style={{ color: '#b00' }}>
        Delete this statement
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 14 }}>
        Delete this statement and its {' '}transactions?
      </span>
      <button onClick={handleDelete} disabled={isDeleting} style={{ color: '#b00' }}>
        {isDeleting ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={() => setIsConfirming(false)}>Cancel</button>
    </span>
  );
}