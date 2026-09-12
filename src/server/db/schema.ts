import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';

/**
 * All money is stored as INTEGER CENTS. 184250 means KSh 1,842.50.
 * Floating point loses money when summed; this is not negotiable.
 */

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const statements = pgTable(
  'statements',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    openingBalance: integer('opening_balance').notNull(),
    closingBalance: integer('closing_balance').notNull(),
    balanceVerified: boolean('balance_verified').notNull(),
    rowCount: integer('row_count').notNull(),
    /** Which version of the parser produced this data. */
    parserVersion: text('parser_version').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [index('idx_statements_user').on(table.userId, table.importedAt)]
);

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    statementId: text('statement_id')
      .notNull()
      .references(() => statements.id, { onDelete: 'cascade' }),
    receiptNo: text('receipt_no').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    /** The untouched source string, for debugging a bad parse without the PDF. */
    detailsRaw: text('details_raw').notNull(),
    type: text('type').notNull(),
    direction: text('direction').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    isRevenue: boolean('is_revenue').notNull(),
    counterpartyName: text('counterparty_name'),
    counterpartyPhone: text('counterparty_phone'),
    chargeForReceipt: text('charge_for_receipt'),
    reversesReceipt: text('reverses_receipt'),
    confidence: text('confidence').notNull(),
    sourcePage: integer('source_page').notNull()
  },
  table => [
    /**
     * Duplicate guard. A charge shares its parent's receipt number, so the
     * type is part of the key — without it, every charge would be rejected as
     * a duplicate of the transaction it belongs to.
     */
    uniqueIndex('idx_tx_user_receipt').on(table.userId, table.receiptNo, table.type),
    index('idx_tx_statement').on(table.statementId),
    index('idx_tx_user_completed').on(table.userId, table.completedAt)
  ]
);

export const parseIssues = pgTable(
  'parse_issues',
  {
    id: text('id').primaryKey(),
    statementId: text('statement_id')
      .notNull()
      .references(() => statements.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    page: integer('page'),
    rawText: text('raw_text'),
    detail: text('detail').notNull()
  },
  table => [index('idx_issues_statement').on(table.statementId)]
);