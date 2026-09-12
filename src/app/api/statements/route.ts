import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, UnauthorizedError } from '@/server/auth/require-authenticated-user';
import { importStatementSchema } from '@/server/validation/statement-schemas';
import { importStatement } from '@/server/services/statement-import-service';
import { listStatementsForUser } from '@/server/services/statement-queries';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const parsed = importStatementSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid statement data' },
        { status: 400 }
      );
    }

    const result = await importStatement(user.id, parsed.data);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sign in to save statements' }, { status: 401 });
    }
    throw error;
  }
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    return NextResponse.json(await listStatementsForUser(user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
    }
    throw error;
  }
}