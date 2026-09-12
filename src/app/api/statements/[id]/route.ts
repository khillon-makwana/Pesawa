import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, UnauthorizedError } from '@/server/auth/require-authenticated-user';
import { deleteStatementForUser } from '@/server/services/statement-queries';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;

    await deleteStatementForUser(user.id, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
    }
    throw error;
  }
}