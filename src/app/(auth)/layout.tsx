import type { ReactNode } from 'react';

/*
 * Auth screens are full-bleed: no site header, no container. The split shell
 * itself lives in AuthSplitLayout, because each page supplies its own tagline.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
