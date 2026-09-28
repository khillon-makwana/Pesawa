// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

let currentPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname
}));

// Imported after the mock so the component sees the fake pathname.
const { HomeLink } = await import('../home-link');

const reload = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  reload.mockClear();
  // jsdom's location cannot be spied on directly, so swap in a stand-in.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload }
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation
  });
  document.body.innerHTML = '';
});

function clickHomeLink(): MouseEvent {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    createRoot(container).render(<HomeLink>Pesawa</HomeLink>);
  });

  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  act(() => {
    container.querySelector('a')!.dispatchEvent(click);
  });
  return click;
}

describe('HomeLink', () => {
  it('reloads when already on the home page, so an open report clears', () => {
    currentPathname = '/';

    const click = clickHomeLink();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(click.defaultPrevented).toBe(true);
  });

  it('navigates normally from any other page', () => {
    currentPathname = '/saved';

    clickHomeLink();

    expect(reload).not.toHaveBeenCalled();
  });
});
