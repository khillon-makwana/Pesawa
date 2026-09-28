// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

let currentPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname
}));

// Imported after the mock so the components see the fake pathname.
const { HomeLink } = await import('../home-link');
const { StatementSessionProvider, useStatementSession } =
  await import('../statement-session');

/** Shows the counter the upload screen is keyed on, so a restart is visible. */
function UploadScreenKey() {
  const { uploadScreenKey } = useStatementSession();
  return <output>{uploadScreenKey}</output>;
}

function render(ui: React.ReactNode): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(ui);
  });
  return container;
}

function clickLink(container: HTMLElement): MouseEvent {
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  act(() => {
    container.querySelector('a')!.dispatchEvent(click);
  });
  return click;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('HomeLink', () => {
  it('restarts the upload screen when already on the home page', () => {
    currentPathname = '/';
    const container = render(
      <StatementSessionProvider>
        <HomeLink>Pesawa</HomeLink>
        <UploadScreenKey />
      </StatementSessionProvider>
    );

    const click = clickLink(container);

    expect(click.defaultPrevented).toBe(true);
    expect(container.querySelector('output')!.textContent).toBe('1');
  });

  it('navigates normally from any other page', () => {
    currentPathname = '/report';
    const container = render(
      <StatementSessionProvider>
        <HomeLink>Pesawa</HomeLink>
        <UploadScreenKey />
      </StatementSessionProvider>
    );

    clickLink(container);

    // Left alone, so Next's link handles it as an ordinary navigation.
    expect(container.querySelector('output')!.textContent).toBe('0');
  });

  it('is an ordinary link outside the site layout, as on the 404 page', () => {
    currentPathname = '/';
    const container = render(<HomeLink>Pesawa</HomeLink>);

    expect(() => clickLink(container)).not.toThrow();
    expect(container.querySelector('a')!.getAttribute('href')).toBe('/');
  });
});
