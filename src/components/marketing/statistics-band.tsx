import { SiteContainer } from '@/components/site-container';

/*
 * Three things worth knowing before uploading anything. Every figure here is
 * either from the shipped sample statement and labelled as such, or a plain
 * description of what the parser does — nothing is a claim about averages
 * across real users, because there is no such data.
 */
export function StatisticsBand() {
  const items = [
    {
      label: 'In the sample statement',
      figure: 'KSh 459',
      detail:
        'charged across its 90 transactions — the number almost nobody adds up for themselves.'
    },
    {
      label: 'Balance check',
      figure: 'Line by line',
      detail:
        'Every running balance is checked against the one before it, so a missing or reversed entry is reported instead of passing quietly.'
    },
    {
      label: 'Where it runs',
      figure: 'Your browser',
      detail:
        'The PDF and its password stay on this device. Nothing is sent to a server, and anything you save stays in this browser.'
    }
  ];

  return (
    <section className="mt-8 bg-surface-dark py-14 text-primary-foreground">
      <SiteContainer className="grid gap-10 sm:grid-cols-3 sm:gap-8">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={index > 0 ? 'sm:border-l sm:border-white/10 sm:pl-8' : undefined}
          >
            <p className="eyebrow flex items-center gap-2 text-primary-foreground/50">
              <span aria-hidden className="text-accent-bright">
                ■
              </span>
              {item.label}
            </p>
            <p className="tabular mt-3 text-3xl font-semibold lg:text-4xl">{item.figure}</p>
            <p className="mt-3 text-sm text-primary-foreground/70">{item.detail}</p>
          </div>
        ))}
      </SiteContainer>
    </section>
  );
}

