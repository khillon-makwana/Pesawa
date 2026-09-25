'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
      <Button variant="destructive" size="sm" onClick={() => setIsConfirming(true)}>
        Delete this statement
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Delete this statement and its transactions?
      </span>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting…' : 'Yes, delete'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setIsConfirming(false)}>
        Cancel
      </Button>
    </span>
  );
}
