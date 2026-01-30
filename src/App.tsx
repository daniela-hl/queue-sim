import { useMemo, useState } from "react";
import QueueResults from "./QueueResults";
import QueueSimulator from "./QueueSimulator";
import { mmcPriority } from "./queueModel";

type TimeUnit = "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";
type QueueType = "infinite" | "finite";

const TIME_UNITS: TimeUnit[] = [
  "seconds",
  "minutes",
  "hours",
  "days",
  "weeks",
  "months",
  "years",
];




type ViewMode = "computations" | "simulator";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("computations");
  const [unit, setUnit] = useState<TimeUnit>("minutes");
  const [queueType, setQueueType] = useState<QueueType>("infinite");

  // Arrival rate λ (customers per chosen time unit)
  const [lambda, setLambda] = useState<number>(30);

  // Service rate μ per server (customers per chosen time unit)
  const [mu, setMu] = useState<number>(60);

  // Number of servers c (integer)
  const [c, setC] = useState<number>(1);

  // Queue capacity K (only for finite queues)
  const [K, setK] = useState<number>(5);

  // Priority classes
  const [usePriorities, setUsePriorities] = useState<boolean>(false);
  // Store fractions for classes 2-4; class 1 is computed as 1 - sum(others)
  const [classFractions, setClassFractions] = useState<number[]>([0, 0.8, 0, 0]);

  // Compute class 1 fraction as 1 - sum of other classes
  const allClassFractions = useMemo(() => {
    const sumOthers = classFractions.slice(1).reduce((sum, f) => sum + (f || 0), 0);
    const fraction1 = 1 - sumOthers;
    return [fraction1, ...classFractions.slice(1)];
  }, [classFractions]);

  // Simple validation: just ensure non-negative values and integers where needed
  const lambdaClamped = useMemo(() => Math.max(0, lambda), [lambda]);
  const muClamped = useMemo(() => Math.max(0, mu), [mu]);
  const cClamped = useMemo(() => Math.max(1, Math.round(c)), [c]);
  const KClamped = useMemo(() => Math.max(0, Math.round(K)), [K]);

  const rho = useMemo(() => {
    if (muClamped <= 0 || cClamped <= 0) return Infinity;
    return lambdaClamped / (cClamped * muClamped);
  }, [lambdaClamped, muClamped, cClamped]);

  const isUnstable = rho >= 1;

  // Calculate priority queue results
  const priorityResults = useMemo(() => {
    if (!usePriorities || queueType !== "infinite" || isUnstable) {
      return null;
    }
    try {
      return mmcPriority({
        c: cClamped,
        arrivalRate: lambdaClamped,
        serviceRate: muClamped,
        classFractions: allClassFractions,
      });
    } catch (error) {
      console.error("Priority queue calculation error:", error);
      return null;
    }
  }, [usePriorities, queueType, isUnstable, cClamped, lambdaClamped, muClamped, allClassFractions]);

  // Convert plural time unit to singular (e.g., "minutes" -> "minute")
  const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 40px", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>Queue Simulator</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Set λ (arrivals), μ (service rate per server), and c (servers) to explore queue behavior.
      </p>

      {/* Mode Toggle */}
      <div style={{ marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>Mode:</div>
        <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: 8, overflow: "hidden" }}>
          <button
            onClick={() => setViewMode("computations")}
            style={{
              padding: "8px 16px",
              border: "none",
              background: viewMode === "computations" ? "#3b82f6" : "white",
              color: viewMode === "computations" ? "white" : "#333",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: viewMode === "computations" ? 600 : 400,
            }}
          >
            Computations
          </button>
          <button
            onClick={() => setViewMode("simulator")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderLeft: "1px solid #ccc",
              background: viewMode === "simulator" ? "#3b82f6" : "white",
              color: viewMode === "simulator" ? "white" : "#333",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: viewMode === "simulator" ? 600 : 400,
            }}
          >
            Simulator
          </button>
        </div>
      </div>

      {/* Time unit and Queue type (only for Computations mode) */}
      {viewMode === "computations" && (
        <div style={{ marginBottom: 14, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>Time unit:</div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as TimeUnit)}
              style={{
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 16,
                background: "white",
              }}
              aria-label="Time unit"
            >
              {TIME_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>Queue type:</div>
            <select
              value={queueType}
              onChange={(e) => setQueueType(e.target.value as QueueType)}
              style={{
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 16,
                background: "white",
              }}
              aria-label="Queue type"
            >
              <option value="infinite">Infinite (M/M/c)</option>
              <option value="finite">Finite (M/M/c/K)</option>
            </select>
          </div>
        </div>
      )}

      {/* Simulator Mode */}
      {viewMode === "simulator" && (
        <QueueSimulator timeUnit={unit} />
      )}

      {/* Computations Mode */}
      {viewMode === "computations" && (
        <>
          {/* Stability warning */}
          {isUnstable && (
        <div
          style={{
            marginBottom: 18,
            padding: "16px 18px",
            borderRadius: 12,
            background: "#fee2e2",
            border: "2px solid #dc2626",
            color: "#7f1d1d",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            ⚠️ UNSTABLE SYSTEM
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.4 }}>
            The arrival rate exceeds total service capacity.
            <br ></br>
            In steady state, the queue will grow without bound and averages do not exist.
          </div>
        </div>
      )}


      {/* PARAMETERS - Combined in one row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
        {/* ARRIVALS */}
        <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
            Arrival rate (λ)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={lambda || ""}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setLambda(0);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              setLambda(v);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
            }}
            aria-label="Arrival rate"
          />
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            per {singularUnit}
          </div>
        </div>

        {/* SERVICES */}
        <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
            Service rate (μ)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={mu || ""}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setMu(0);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              setMu(v);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
            }}
            aria-label="Service rate"
          />
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            per {singularUnit}
          </div>
        </div>

        {/* SERVERS */}
        <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
            Number of servers (c)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={c || ""}
            placeholder="1"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setC(0);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              setC(v);
            }}
            onBlur={() => {
              if (c < 1) setC(1);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
            }}
            aria-label="Number of servers"
          />
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            servers
          </div>
        </div>
      </div>

      {/* QUEUE CAPACITY (only for finite queues) */}
      {queueType === "finite" && (
        <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginBottom: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
            Queue Capacity (K)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={K || ""}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setK(0);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              setK(v);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              maxWidth: 300,
            }}
            aria-label="Queue capacity"
          />
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            Max customers waiting (Total system capacity N = c + K = {cClamped + KClamped})
          </div>
        </div>
      )}

      {/* QUEUE RESULTS */}
      <QueueResults
        c={cClamped}
        lambda={lambdaClamped}
        mu={muClamped}
        timeUnit={unit}
        queueType={queueType}
        K={KClamped}
      />

      {/* PRIORITY CLASSES */}
      <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Priority Classes</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={usePriorities}
              onChange={(e) => setUsePriorities(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 14 }}>Enable priorities</span>
          </label>
        </div>

        {usePriorities && queueType !== "infinite" && (
          <div style={{ padding: 12, backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, color: "#856404" }}>
            Priority classes are only available for infinite queues (M/M/c). Please select "Infinite (M/M/c)" from the Queue type dropdown above.
          </div>
        )}

        {usePriorities && queueType === "infinite" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #333" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>Class</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>Percentage</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>Ii (k)</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>Ti (k)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: classFractions.length }).map((_, idx) => {
                  const classNum = idx + 1;
                  const classResult = priorityResults?.classes[idx];
                  const fraction = allClassFractions[idx];
                  const isFirstClass = idx === 0;

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "8px 12px" }}>
                        {classNum === 1 ? "highest priority = 1" : classNum}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        {isFirstClass ? (
                          // Class 1: computed value, not editable
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {(fraction * 100).toFixed(0)}%
                          </span>
                        ) : (
                          // Classes 2-4: editable
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={classFractions[idx] > 0 ? (classFractions[idx] * 100).toFixed(0) : ""}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value;
                              const newFractions = [...classFractions];
                              if (raw === "") {
                                newFractions[idx] = 0;
                              } else {
                                const v = Number(raw);
                                if (Number.isFinite(v) && v >= 0 && v <= 100) {
                                  newFractions[idx] = v / 100; // Convert percentage to fraction
                                }
                              }
                              setClassFractions(newFractions);
                            }}
                            style={{
                              width: 80,
                              padding: "6px 8px",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                              fontSize: 14,
                              textAlign: "center",
                              backgroundColor: "white",
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                        {classResult ? classResult.Ii_k.toFixed(3) : "0.000"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                        {classResult ? classResult.Ti_k.toFixed(4) : "0.0000"}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ borderTop: "2px solid #333", fontWeight: 700 }}>
                  <td style={{ padding: "8px 12px" }}>Total</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {(allClassFractions.reduce((sum, f) => sum + (f || 0), 0) * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {priorityResults
                      ? priorityResults.classes.reduce((sum, c) => sum + c.Ii_k, 0).toFixed(3)
                      : "0.000"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>-</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
              Note: Priority class 1 has highest priority. Class 1 fraction is computed as 100% minus the sum of other classes. Ti(k) is in {unit}.
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
