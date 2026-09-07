/**
 * Attempt rows store timestamptz (UTC). The student body this app serves is
 * in India (IST, UTC+5:30) so late-night work is judged in IST.
 * The offset is a documented constant, not read from the client clock,
 * so a student can't game it and behaviour stays consistent server-side.
 */
export const STUDENT_TZ_OFFSET_MIN = 5 * 60 + 30;

export function hourInTz(isoUtc: string, offsetMin: number = STUDENT_TZ_OFFSET_MIN): number {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return -1;
  const shifted = new Date(d.getTime() + offsetMin * 60_000);
  return shifted.getUTCHours();
}

/** True when the moment falls in a rough "should be asleep" window. */
export function isLateNightHour(hour: number): boolean {
  return hour >= 22 || hour < 5;
}

export function hoursAgo(isoUtc: string, nowIso: string): number {
  const ms = new Date(nowIso).getTime() - new Date(isoUtc).getTime();
  return ms / 3_600_000;
}
