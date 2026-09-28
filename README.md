# Pesawa

Reads a Safaricom M-PESA statement PDF in your browser and shows where your money went, what you paid in fees, and whether the statement adds up.

## Screenshots

<!-- TODO: add screenshots -->

|                    |                    |
| ------------------ | ------------------ |
| _Upload screen_    | _Statement report_ |
| _Saved statements_ | _Dark mode_        |

## What it does

- Opens password-protected M-PESA statement PDFs without uploading them anywhere.
- Turns the statement table into typed transactions, across 16 transaction types.
- Checks every printed running balance, and reports any row that does not add up.
- Breaks spending down by category, counterparty, fees and time of day.
- Exports transactions and parsing issues as CSV.
- Optionally saves statements in your browser so you do not have to open the file again.
- Merges overlapping statements without duplicating rows, and links a fee to a payment in an earlier statement.
- Backs everything up to a JSON file, and restores it.
- Follows your system light or dark setting.

## How it works

```
PDF + password
      ↓  decrypt     pdf.js opens the file in the browser
      ↓  extract     every text fragment, with its position on the page
      ↓  parse       positions become rows, rows become typed transactions
      ↓  verify      walk the running balance and report anything that breaks
      ↓  analyse     totals, categories, counterparties, timing
```

Only the first step knows pdf.js exists. Everything after it works on plain data, which is why the rest can be tested without a PDF.

The balance check is the useful part. Safaricom prints the balance after every row, so the parser can add up what it read and compare. If the two disagree, something was misread — or missing from the statement. Run against a real four-page statement, it parsed 138 transactions with none unrecognised, and found that Safaricom had **left a transaction out of its own statement**: a fee appeared with no matching payment, and the closing balance was short by exactly that amount.

[`docs/parsing.md`](docs/parsing.md) explains the parsing in detail, including what it cannot handle.

## Tech stack

|            |                                                             |
| ---------- | ----------------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19                           |
| Language   | TypeScript, strict mode                                     |
| PDF        | pdf.js (`pdfjs-dist`), `pdf-lib` for generating the samples |
| Storage    | IndexedDB via `idb`                                         |
| Validation | Zod                                                         |
| Styling    | Tailwind CSS v4, shadcn/ui, Base UI                         |
| Tests      | Vitest, `fake-indexeddb`, jsdom                             |
| Tooling    | ESLint, Prettier                                            |

No server, no database, no environment variables.

## Design decisions

**Everything runs in the browser.** The PDF and its password are read in the tab and never sent anywhere. There is no upload endpoint, because there is no server — the site is static files. The only network request the app makes is fetching the sample statements from its own `public/` folder. You can check this in the Network tab.

**Storage is local-first.** Saving is opt-in, and saved statements go to IndexedDB in your browser. Nothing syncs, which means a new browser starts empty — so there is a backup you can export as JSON and import again. Imports are validated with Zod and carry a schema version, so a file from a future version is refused rather than half-read.

**Money is stored as integer cents.** `184250` means KSh 1,842.50. Floating point loses money when you add it up, and a reconciliation tool that quietly loses money is worse than no tool. The conversion to a decimal happens only at the edges, in the display and the CSV export.

**The parser is isolated.** Nothing in `src/lib/parser/` imports anything outside that folder. When it needs something the outside world knows — like whether a fee's payment appears in a statement you saved last month — it takes a plain function as an argument instead of reaching for storage itself. That is what keeps it testable without a PDF or a browser.

**Sign-in and the database were removed.** This started with accounts, sessions and Postgres: Argon2id password hashing, hashed session tokens, rate-limited logins, a five-table schema. All of it worked. It was removed because it contradicted the product — asking someone to hand their financial history to a server, for an app whose main promise is that their financial history never reaches a server.

That code is preserved, complete and runnable, on the [`with-auth-and-storage`](../../tree/with-auth-and-storage) branch.

## Security

The app sends a Content Security Policy and the usual hardening headers on every route, set in [`next.config.ts`](next.config.ts).

The directive that matters is **`connect-src 'self'`**. Everything else in this project promising that your statement stays on your device is a promise about the code — that no one added a `fetch` to somewhere else, and that no dependency does it quietly. `connect-src 'self'` moves that from a promise to something the browser enforces. No fetch, XHR, WebSocket or beacon can reach another origin. If some future change tried to upload your transactions, the browser would block the request and log it, rather than letting it through.

The rest, briefly:

| Directive                                                                              | Why                                                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `default-src 'self'`                                                                   | Nothing loads from another origin unless a rule below allows it.                                                        |
| `worker-src 'self' blob:`                                                              | The pdf.js worker is served from `public/`; `blob:` covers its fallback.                                                |
| `img-src 'self' data: blob:`                                                           | No remote images. Only this origin, and anything the page generates.                                                    |
| `font-src 'self'`                                                                      | `next/font` downloads Google Fonts at build time and serves them locally, so nothing is fetched from Google at runtime. |
| `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` | No plugins, no rewriting relative URLs, no posting elsewhere, no framing.                                               |

`script-src` and `style-src` allow `'unsafe-inline'`. The strict alternative is a per-request nonce, which needs middleware and would make every route dynamic — losing static delivery. For four static pages that never render user content as HTML, that trade is worth making.

`script-src` also allows `'wasm-unsafe-eval'`, because the pdf.js worker instantiates WebAssembly for its image decoders. That directive permits WebAssembly compilation and nothing else — JavaScript `eval()` and `new Function()` stay blocked. Plain `'unsafe-eval'` is added in development only, where the dev server needs it for fast refresh, and is absent from production builds.

## Running it

Requires Node 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000. No `.env` file, and nothing to configure.

`npm install` copies the pdf.js worker into `public/` for you.

No statement to hand? The upload screen has two sample statements built from entirely invented data. The second one has a transaction removed, so you can see the balance check catch it.

## Tests

```bash
npm test
```

178 tests across 18 files, covering the parser, the analysis, CSV export, browser storage, and backup import and export. They run in about a second. None of them needs a real PDF, a server or a database — IndexedDB is faked, and the one component test renders into a simulated DOM.

## Other commands

```bash
npm run build         # production build
npm run lint          # ESLint
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
```

## Notes

Pesawa is a portfolio project, not a commercial service. It is not affiliated with Safaricom, and M-PESA is their trademark.
