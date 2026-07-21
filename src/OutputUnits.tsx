import { DEFAULT_HOURS_PER_DAY, TIME_UNITS, type TimeUnit } from "./timeUnits";
import type { OutputUnits } from "./useOutputUnits";

/** The "Change output units" toggle button. */
export function OutputUnitsButton({ state }: { state: OutputUnits }) {
  return (
    <button
      onClick={() => state.setShowPanel((s) => !s)}
      style={{
        padding: "6px 12px",
        border: "1px solid #3b82f6",
        borderRadius: 8,
        background: state.showPanel ? "#3b82f6" : "white",
        color: state.showPanel ? "white" : "#3b82f6",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      Change output units
    </button>
  );
}

/** The expandable "pocket" with the output-unit and hours-per-day controls. */
export function OutputUnitsPocket({
  state,
  hoursHint = "(use 8 for a working day; affects day/week/month/year conversions)",
}: {
  state: OutputUnits;
  hoursHint?: string;
}) {
  if (!state.showPanel) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 16,
        padding: "12px 14px",
        border: "1px solid #bfdbfe",
        borderRadius: 10,
        background: "#eff6ff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>Show outputs in</span>
        <select
          value={state.outputUnit}
          onChange={(e) => state.setOutputUnit(e.target.value as TimeUnit)}
          style={{
            padding: "6px 10px",
            border: "1px solid #ccc",
            borderRadius: 8,
            fontSize: 15,
            background: "white",
          }}
          aria-label="Output time unit"
        >
          {TIME_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {state.showAltUnit && (
          <span style={{ fontSize: 13, color: "#2563eb" }}>
            Converted values shown in blue.
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>1 day =</span>
        <input
          type="text"
          inputMode="decimal"
          value={state.hoursPerDayStr}
          placeholder={String(DEFAULT_HOURS_PER_DAY)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || raw === "." || /^[0-9]*\.?[0-9]*$/.test(raw)) {
              state.setHoursPerDayStr(raw);
              const v = Number(raw);
              if (raw !== "" && Number.isFinite(v) && v > 0) state.setHoursPerDay(v);
            }
          }}
          onBlur={() => {
            if (!(state.hoursPerDay > 0) || state.hoursPerDayStr === "" || state.hoursPerDayStr === ".") {
              state.setHoursPerDay(DEFAULT_HOURS_PER_DAY);
              state.setHoursPerDayStr(String(DEFAULT_HOURS_PER_DAY));
            }
          }}
          style={{
            width: 70,
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 8,
            fontSize: 15,
            background: "white",
          }}
          aria-label="Hours per day"
        />
        <span style={{ fontWeight: 600 }}>hours</span>
        <span style={{ fontSize: 13, color: "#666" }}>{hoursHint}</span>
      </div>
    </div>
  );
}
