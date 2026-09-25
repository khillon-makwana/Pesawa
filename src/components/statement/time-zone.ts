/**
 * M-PESA statements are written in East Africa Time, so every date and time on
 * screen is read in that zone rather than the viewer's. Two reasons: a row
 * would otherwise show a different hour to the one printed on the statement,
 * and a server-rendered date would disagree with the browser's on hydration.
 *
 * The analysis layer makes the same choice — see EAT_OFFSET_HOURS in
 * lib/analysis/summarise-payment-timing.ts.
 */
export const STATEMENT_TIME_ZONE = 'Africa/Nairobi';
