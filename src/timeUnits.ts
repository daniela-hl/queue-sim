/**
 * Shared time-unit definitions and conversion helpers.
 *
 * The queue model keeps arrival/service rates in a single "input" time unit.
 * These helpers let us re-express time-valued outputs (waiting time, time in
 * system) and rate-valued outputs (effective arrival rate, balking rate) in a
 * different "output" unit without recomputing the model.
 */

export type TimeUnit =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

export const TIME_UNITS: TimeUnit[] = [
  "seconds",
  "minutes",
  "hours",
  "days",
  "weeks",
  "months",
  "years",
];

/** Default number of hours in a day (calendar convention). */
export const DEFAULT_HOURS_PER_DAY = 24;

/**
 * Length of a unit in seconds.
 *
 * Seconds, minutes, and hours are fixed clock time. A "day" is `hoursPerDay`
 * hours long — 24 by default, but operations-management problems often use an
 * 8-hour working day. Weeks/months/years are multiples of that day (7,
 * 365.25/12, and 365.25 days respectively) so all day-based units stay
 * internally consistent with the chosen day length.
 */
export function unitSeconds(unit: TimeUnit, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): number {
  const daySeconds = hoursPerDay * 3600;
  switch (unit) {
    case "seconds":
      return 1;
    case "minutes":
      return 60;
    case "hours":
      return 3600;
    case "days":
      return daySeconds;
    case "weeks":
      return 7 * daySeconds;
    case "months":
      return (365.25 / 12) * daySeconds;
    case "years":
      return 365.25 * daySeconds;
  }
}

/** Convert plural time unit to singular (e.g., "minutes" -> "minute"). */
export function singular(unit: string): string {
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

/**
 * Convert a time-valued quantity (e.g. average wait) from one unit to another.
 * 2 minutes -> hours = 2 * (60 / 3600). With an 8-hour day, 1 day -> hours = 8.
 */
export function convertTime(
  value: number,
  from: TimeUnit,
  to: TimeUnit,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY,
): number {
  return (value * unitSeconds(from, hoursPerDay)) / unitSeconds(to, hoursPerDay);
}

/**
 * Convert a rate-valued quantity (e.g. customers per unit time) from one unit
 * to another. 30 per minute -> per hour = 30 * (3600 / 60).
 */
export function convertRate(
  value: number,
  from: TimeUnit,
  to: TimeUnit,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY,
): number {
  return (value * unitSeconds(to, hoursPerDay)) / unitSeconds(from, hoursPerDay);
}

/**
 * Adaptive number formatting so that converting to a much larger unit does not
 * collapse a value to "0.00".
 */
export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  if (abs >= 0.01) return v.toFixed(3);
  if (abs >= 0.0001) return v.toFixed(5);
  return v.toExponential(2);
}
