import { getAuthenticatedUser } from '@/server/auth/require-authenticated-user';
import { UploadStatementView } from './upload-statement-view';

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  return <UploadStatementView isSignedIn={user !== null} />;
}