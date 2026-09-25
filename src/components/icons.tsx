/*
 * Small inline icons. Hand-written rather than pulled from an icon package:
 * there are four of them, and each is a handful of paths.
 */
export function DocumentGlyph() {
  return (
    <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    </span>
  );
}

export function PlayGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 6 3.5-6 3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WarningGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  );
}

export function DownloadGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
    </svg>
  );
}
