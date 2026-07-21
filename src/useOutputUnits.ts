import { useState } from "react";
import {
  DEFAULT_HOURS_PER_DAY,
  convertRate,
  convertTime,
  type TimeUnit,
} from "./timeUnits";

/**
 * State + converters for the "Change output units" control, so the performance
 * metrics and the priority table can each re-express time-valued outputs in a
 * chosen unit (with a configurable day length) independently.
 */
export function useOutputUnits(inputUnit: TimeUnit) {
  const [showPanel, setShowPanel] = useState<boolean>(false);
  const [outputUnit, setOutputUnit] = useState<TimeUnit>(inputUnit);
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS_PER_DAY);
  const [hoursPerDayStr, setHoursPerDayStr] = useState<string>(String(DEFAULT_HOURS_PER_DAY));

  return {
    inputUnit,
    showPanel,
    setShowPanel,
    outputUnit,
    setOutputUnit,
    hoursPerDay,
    setHoursPerDay,
    hoursPerDayStr,
    setHoursPerDayStr,
    showAltUnit: outputUnit !== inputUnit,
    /** Convert a time-valued output into the selected output unit. */
    toTime: (v: number) => convertTime(v, inputUnit, outputUnit, hoursPerDay),
    /** Convert a rate-valued output into the selected output unit. */
    toRate: (v: number) => convertRate(v, inputUnit, outputUnit, hoursPerDay),
  };
}

export type OutputUnits = ReturnType<typeof useOutputUnits>;
