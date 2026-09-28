'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ParseResult } from '@/lib/parser/types';
import type { SaveResult } from '@/lib/storage/saved-statements';

/** A statement that has been read and is on screen, saved or not. */
export interface OpenStatement {
  result: ParseResult;
  fileName: string;
  /** Set once saved, so the report still says so after Back and Forward. */
  saved: (SaveResult & { isSessionOnly: boolean }) | null;
}

interface StatementSession {
  openStatement: OpenStatement | null;
  setOpenStatement: (statement: OpenStatement) => void;

  /*
   * The logo on the home page. The password prompt and error message are
   * states of "/" rather than pages of their own, so a link to "/" from them
   * goes nowhere — you are already there. Changing this number remounts the
   * upload screen instead, which is what "go home" means.
   */
  uploadScreenKey: number;
  restartUploadScreen: () => void;
}

const StatementSessionContext = createContext<StatementSession | null>(null);

/**
 * Holds the open statement in memory while you move between the upload screen
 * and the report.
 *
 * Memory only, deliberately: nothing here reaches browser storage, so a
 * refresh or closed tab forgets the statement exactly as it did when the
 * report was part of the home page. Saving is still a separate, opt-in step.
 */
export function StatementSessionProvider({ children }: { children: ReactNode }) {
  const [openStatement, setOpenStatement] = useState<OpenStatement | null>(null);
  const [uploadScreenKey, setUploadScreenKey] = useState(0);

  return (
    <StatementSessionContext.Provider
      value={{
        openStatement,
        setOpenStatement,
        uploadScreenKey,
        restartUploadScreen: () => setUploadScreenKey(key => key + 1)
      }}
    >
      {children}
    </StatementSessionContext.Provider>
  );
}

export function useStatementSession(): StatementSession {
  const session = useContext(StatementSessionContext);

  if (session === null) {
    throw new Error('useStatementSession must be used inside StatementSessionProvider');
  }

  return session;
}

/**
 * The same session, or null outside the provider. The logo also appears on the
 * 404 and error pages, which sit outside the site layout and so have none.
 */
export function useOptionalStatementSession(): StatementSession | null {
  return useContext(StatementSessionContext);
}
