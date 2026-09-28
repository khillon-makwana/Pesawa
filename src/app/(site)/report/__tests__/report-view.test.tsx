// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ParseResult, Transaction } from '@/lib/parser/types';
import {
  StatementSessionProvider,
  useStatementSession
} from '@/components/statement-session';
import { listSavedStatements, deleteAllSavedData } from '@/lib/storage/saved-statements';
import { resetForTests } from '@/lib/storage/statement-database';
import { ReportView } from '../report-view';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    receiptNo: 'SAMPLE0A01',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 40000,
    balanceAfter: 100000,
    isRevenue: false,
    counterpartyName: 'ASHA WAMBUI',
    counterpartyPhone: '254712345678',
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

const result: ParseResult = {
  meta: {
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-31T00:00:00.000Z',
    openingBalance: 140000,
    closingBalance: 100000,
    accountLabel: null,
    balanceVerified: true,
    parserVersion: '0.1.0'
  },
  transactions: [buildTransaction()],
  issues: []
};

/** Opens a statement, as the upload page does before navigating here. */
function OpenStatementFirst() {
  const { setOpenStatement } = useStatementSession();
  useEffect(() => {
    setOpenStatement({ result, fileName: 'august.pdf', saved: null });
  }, [setOpenStatement]);
  return null;
}

/**
 * Mounts or unmounts the report, as leaving for "/" with Back and returning
 * with Forward would. The session survives because it lives in the layout.
 */
function ReportThatCanBeLeft() {
  const [shown, setShown] = useState(true);
  return (
    <>
      <button onClick={() => setShown(value => !value)}>toggle</button>
      {shown && <ReportView />}
    </>
  );
}

function render(ui: React.ReactNode): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(ui);
  });
  return container;
}

/** Storage writes finish over several ticks, so wait for the screen to catch up. */
async function waitForText(container: HTMLElement, text: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (container.textContent?.includes(text)) {
      return;
    }
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
  throw new Error(`Timed out waiting for "${text}"`);
}

function buttonNamed(
  container: HTMLElement,
  text: string
): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find(button =>
    button.textContent?.includes(text)
  );
}

beforeEach(async () => {
  await resetForTests();
  await deleteAllSavedData();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ReportView', () => {
  it('explains that nothing is open after a refresh or a direct visit', () => {
    const container = render(
      <StatementSessionProvider>
        <ReportView />
      </StatementSessionProvider>
    );

    expect(container.textContent).toContain('No statement is open');
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('shows the open statement', () => {
    const container = render(
      <StatementSessionProvider>
        <OpenStatementFirst />
        <ReportView />
      </StatementSessionProvider>
    );

    expect(container.textContent).toContain('Save on this device');
    expect(container.textContent).not.toContain('No statement is open');
  });

  it('does not offer to save again after going Back and Forward', async () => {
    const container = render(
      <StatementSessionProvider>
        <OpenStatementFirst />
        <ReportThatCanBeLeft />
      </StatementSessionProvider>
    );

    act(() => buttonNamed(container, 'Save on this device')!.click());
    await waitForText(container, 'Saved 1 transaction');

    // Leave the report and come back.
    act(() => buttonNamed(container, 'toggle')!.click());
    act(() => buttonNamed(container, 'toggle')!.click());

    expect(container.textContent).toContain('Saved 1 transaction');
    expect(buttonNamed(container, 'Save on this device')).toBeUndefined();
    expect(await listSavedStatements()).toHaveLength(1);
  });
});
