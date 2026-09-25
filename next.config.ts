import type { NextConfig } from 'next';

/*
 * The dev server evaluates code for fast refresh, which needs 'unsafe-eval'.
 * Production does not, so it is only added here.
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/*
 * Content Security Policy.
 *
 * The directive that matters most is `connect-src 'self'`. It is what turns
 * "your statement never leaves the browser" from a promise about the code into
 * something the browser enforces: no fetch, XHR, WebSocket or beacon can reach
 * another origin, so a mistake or a compromised dependency cannot quietly ship
 * someone's transactions anywhere.
 *
 * `'unsafe-inline'` is here for scripts and styles because the strict
 * alternative is a per-request nonce, and that needs middleware, which would
 * make every route dynamic. This app is four static pages with no user content
 * rendered as HTML, so the trade is worth it: static delivery in exchange for
 * an inline-script rule that has little to bite on.
 */
const contentSecurityPolicy = [
  // Default for anything not named below: this origin only.
  "default-src 'self'",

  // Next.js inlines its bootstrap script; see the note above on nonces.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,

  // Tailwind ships as a stylesheet, but Next inlines some critical CSS.
  "style-src 'self' 'unsafe-inline'",

  // The pdf.js worker is served from public/. blob: covers the fallback it
  // builds itself when the served file cannot be used directly.
  "worker-src 'self' blob:",

  // No remote images. data: and blob: are for anything generated in the page.
  "img-src 'self' data: blob:",

  // next/font downloads Google Fonts at build time and serves them from here.
  "font-src 'self'",

  // The whole point: no network request may leave this origin.
  "connect-src 'self'",

  // No plugins, ever.
  "object-src 'none'",

  // Stop injected markup from re-pointing every relative URL.
  "base-uri 'self'",

  // There is no form that posts anywhere, so nothing legitimate is lost.
  "form-action 'self'",

  // Belt and braces with X-Frame-Options below: no framing, so no clickjacking.
  "frame-ancestors 'none'"
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },

  // Trust the declared Content-Type rather than sniffing the bytes.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Never name this site, or the page being read, to anywhere else.
  { key: 'Referrer-Policy', value: 'no-referrer' },

  // The older header that says the same as frame-ancestors, for older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },

  // None of these are used, so none are granted.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default nextConfig;
