import type { ReactNode } from 'react';
import Link from 'next/link';
import { LedgerBackdrop } from './ledger-backdrop';

/*
 * Both auth screens: a dark panel carrying the wordmark and the page's own
 * one-line promise, and a light panel carrying the form. The dark half is
 * decoration and collapses away below `lg`, where the form is all that matters.
 */
export function AuthSplitLayout({
  tagline,
  notes,
  children
}: {
  tagline: string;
  notes: { label: string; detail: string }[];
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        {/*
          Texture only. Each block of real copy carries the panel's own
          background so it masks the rows behind it — the ledger fills the gaps
          between them and runs off the top and bottom edges, rather than
          printing through the words.
        */}
        <LedgerBackdrop className="absolute inset-x-0 -top-6" />
        <LedgerBackdrop className="absolute inset-x-0 -bottom-6" />

        <div className="relative flex items-center gap-3 bg-primary py-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
          >
            <span aria-hidden className="text-[0.6em]">
              ■
            </span>
            Pesawa
          </Link>
          <span className="chip bg-white/10">Offline first</span>
        </div>

        <div className="relative max-w-md bg-primary py-6">
          <p className="eyebrow text-primary-foreground/60">Privacy by default</p>
          <p className="mt-4 font-heading text-3xl leading-tight font-bold">{tagline}</p>
        </div>

        <dl className="relative grid max-w-md grid-cols-2 gap-6 border-t border-white/15 bg-primary pt-6 pb-2">
          {notes.map(note => (
            <div key={note.label}>
              <dt className="eyebrow text-primary-foreground/60">{note.label}</dt>
              <dd className="mt-1.5 text-sm text-primary-foreground/90">{note.detail}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
