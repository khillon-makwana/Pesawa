'use client';

import { useEffect, useState } from 'react';

/**
 * Highlights whichever section is currently on screen. Purely an enhancement —
 * the links are ordinary anchors and work without any of this.
 */
export function PrivacyToc({ sections }: { sections: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const onScreen = entries.filter(entry => entry.isIntersecting);
        if (onScreen.length > 0) {
          setActiveId(onScreen[0].target.id);
        }
      },
      // Only the upper part of the viewport counts, so the "current" section is
      // the one being read rather than whatever is peeking in from below.
      { rootMargin: '0px 0px -70% 0px' }
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="On this page"
      className="rounded-lg border border-border bg-card p-4"
    >
      <p className="eyebrow flex items-baseline justify-between gap-2 border-b border-border pb-3 text-muted-foreground">
        <span>Table of contents</span>
        <span>{String(sections.length).padStart(2, '0')} sections</span>
      </p>

      <ol className="mt-3 space-y-1">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeId === section.id ? 'true' : undefined}
              className={`flex gap-2 rounded-sm border-l-2 py-1.5 pl-3 text-xs transition-colors ${
                activeId === section.id
                  ? 'border-primary bg-muted/60 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="tabular shrink-0">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
