import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteContainer } from '@/components/site-container';
import { PrivacyToc } from './privacy-toc';

/*
 * The sidebar and the body render from this one list, so a section can never
 * appear in the contents without appearing in the page, or the other way round.
 */
const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'read-in-your-browser',
    title: 'Your statement is read in your browser',
    body: (
      <>
        <p>
          When you select a statement, the PDF is opened and read by code running in this
          browser tab. The file itself is never uploaded, and the password you enter to
          open it is used once and then discarded. Neither ever reaches a server.
        </p>

        <Callout title="Verify it yourself">
          <p>
            Open your browser&apos;s developer tools, switch to the Network tab, and watch
            while you open a statement. No request carries the file or the password.
          </p>
          <ol className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
            <li>1. Press F12, or Cmd + Option + I on a Mac.</li>
            <li>2. Select the Network tab and tick “Preserve log”.</li>
            <li>3. Open a statement, and watch for requests that never arrive.</li>
          </ol>
        </Callout>
      </>
    )
  },
  {
    id: 'nothing-is-sent',
    title: 'Nothing is sent to a server',
    body: (
      <>
        <p>
          There are no accounts and no database behind this site. Nothing you open here is
          uploaded, because there is nowhere for it to go — the site is static files and
          all the work happens in this tab.
        </p>
        <p>
          Saving is optional. If you choose to save a statement, it is written to storage
          inside this browser and goes no further. A different browser, or a different
          device, will not have it.
        </p>

        <Matrix
          rows={[
            { label: 'The PDF itself', value: 'Never stored, never sent', tone: 'good' },
            {
              label: 'The statement password',
              value: 'Used once, discarded',
              tone: 'good'
            },
            {
              label: 'Parsed transactions, not saved',
              value: 'Gone when you close the tab',
              tone: 'good'
            },
            {
              label: 'Parsed transactions, saved',
              value: 'In this browser until you delete them',
              tone: 'neutral'
            },
            { label: 'Accounts and sign-in', value: 'None', tone: 'good' },
            { label: 'Cookies and trackers', value: 'None', tone: 'good' }
          ]}
        />
      </>
    )
  },
  {
    id: 'deleting-your-data',
    title: 'Deleting your data',
    body: (
      <>
        <p>
          Saved statements are listed on the{' '}
          <Link href="/saved" className="underline underline-offset-4">
            saved statements
          </Link>{' '}
          page. Each one can be deleted on its own, and{' '}
          <strong className="font-medium text-foreground">Delete all my data</strong> on
          that page clears every statement and transaction from this browser in one go.
          Both take effect immediately and cannot be undone.
        </p>
        <p>
          Clearing your browser&apos;s site data removes it too, as does any setting that
          clears storage when you close the browser.
        </p>
      </>
    )
  },
  {
    id: 'what-this-project-is',
    title: 'What this project is',
    body: (
      <>
        <p>
          This is a portfolio project rather than a commercial service. It is not
          marketed, and it is shared by link.
        </p>
        <p>
          Pesawa is not affiliated with Safaricom, and M-PESA is their trademark, not
          ours.
        </p>
      </>
    )
  }
];

export default function PrivacyPage() {
  return (
    <SiteContainer>
      <div className="py-8">
        <p className="eyebrow border-b border-border pb-4 text-muted-foreground">
          How Pesawa handles your statement
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <PrivacyToc sections={SECTIONS.map(({ id, title }) => ({ id, title }))} />

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="eyebrow flex items-center gap-2 text-muted-foreground">
                <span aria-hidden className="text-[var(--color-money-in)]">
                  ●
                </span>
                Client-side parsing
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                PDF documents and their unlock codes stay in this tab&apos;s memory and
                are gone on reload.
              </p>
              <p className="mt-3 font-mono text-[0.625rem] text-muted-foreground">
                Engine: Mozilla PDF.js
              </p>
            </div>
          </aside>

          <article className="max-w-2xl">
            <h1 className="font-heading text-4xl font-bold tracking-tight">Privacy</h1>
            <p className="mt-3 text-muted-foreground">
              How Pesawa reads mobile money statements without uploading them, storing
              them, or tracking you.
            </p>

            <div className="mt-10 space-y-12">
              {SECTIONS.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-8">
                  <h2 className="flex gap-3 font-heading text-xl font-bold">
                    <span className="tabular text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-14 flex items-center gap-3 rounded-lg bg-primary px-5 py-4 text-sm text-primary-foreground">
              <span aria-hidden className="text-accent-bright">
                ■
              </span>
              Portfolio project · Client-side PDF parsing · Nothing sent to a server · No
              accounts, no cookies, no trackers.
            </p>
          </article>
        </div>
      </div>
    </SiteContainer>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-foreground/80 bg-card p-5">
      <p className="eyebrow text-foreground">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Matrix({
  rows
}: {
  rows: { label: string; value: string; tone: 'good' | 'neutral' }[];
}) {
  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-border text-left">
      <caption className="eyebrow bg-muted/60 px-4 py-2.5 text-left text-muted-foreground">
        What is kept, and for how long
      </caption>
      <tbody className="divide-y divide-border">
        {rows.map(row => (
          <tr key={row.label} className="bg-card">
            <th scope="row" className="px-4 py-2.5 text-sm font-normal text-foreground">
              {row.label}
            </th>
            <td
              className={`px-4 py-2.5 text-right text-xs ${
                row.tone === 'good'
                  ? 'text-[var(--color-money-in)]'
                  : 'text-muted-foreground'
              }`}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
