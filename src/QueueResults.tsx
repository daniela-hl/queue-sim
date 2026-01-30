import { useMemo, useState } from "react";
import { mmcInfinite, mmckFinite, type InfiniteQueueResult, type FiniteQueueResult } from "./queueModel";

interface QueueResultsProps {
  /** Number of servers */
  c: number;
  /** Arrival rate (customers per time unit) */
  lambda: number;
  /** Service rate per server (customers per time unit) */
  mu: number;
  /** Time unit for display */
  timeUnit: string;
  /** Queue type: 'infinite' or 'finite' */
  queueType: "infinite" | "finite";
  /** Queue capacity (only for finite queues) */
  K?: number;
}

export default function QueueResults({
  c,
  lambda,
  mu,
  timeUnit,
  queueType,
  K = 0,
}: QueueResultsProps) {
  // State for probability threshold parameters
  const [t, setT] = useState<number>(0);
  const [Q, setQ] = useState<number>(0);

  const rho = useMemo(() => {
    if (mu <= 0 || c <= 0) return Infinity;
    return lambda / (c * mu);
  }, [lambda, mu, c]);

  const isUnstable = rho >= 1;

  // Calculate queue metrics
  const results = useMemo(() => {
    try {
      if (queueType === "finite") {
        return mmckFinite({
          c,
          K,
          arrivalRate: lambda,
          serviceRate: mu,
          Q,
        });
      } else {
        if (isUnstable) {
          return null; // Can't calculate for unstable system
        }
        return mmcInfinite({
          c,
          arrivalRate: lambda,
          serviceRate: mu,
          Q,
          t,
        });
      }
    } catch (error) {
      console.error("Queue calculation error:", error);
      return null;
    }
  }, [c, K, lambda, mu, queueType, isUnstable, Q, t]);

  if (!results) {
    return (
      <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>Queue Metrics</h2>
        <p style={{ color: "#999" }}>
          {isUnstable
            ? "System is unstable - queue metrics cannot be calculated"
            : "Unable to calculate queue metrics"}
        </p>
      </div>
    );
  }

  const isFinite = queueType === "finite";
  const finiteResults = isFinite ? (results as FiniteQueueResult) : null;
  const infiniteResults = !isFinite ? (results as InfiniteQueueResult) : null;

  return (
    <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>
        Performance Metrics
      </h2>

      {/* Whole System */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Whole system:</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingLeft: 12 }}>
          <div>
            <span style={{ color: "#666" }}>Average # customers in system: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{results.I.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: "#666" }}>Average time in system: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{results.T.toFixed(2)} {timeUnit}</span>
          </div>
        </div>
      </div>

      {/* Waiting Line */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Waiting line:</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingLeft: 12 }}>
          <div>
            <span style={{ color: "#666" }}>Average # customers waiting: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{results.Ii.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: "#666" }}>Average time waiting: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{results.Ti.toFixed(2)} {timeUnit}</span>
          </div>
          {infiniteResults && (
            <div>
              <span style={{ color: "#666" }}>Average probability of wait: </span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{(infiniteResults.Pw * 100).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Servers */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Servers:</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingLeft: 12 }}>
          <div>
            <span style={{ color: "#666" }}>Average # customers in service: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{results.Ip.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: "#666" }}>Average utilization of servers: </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{(results.Utilization * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Additional metrics for finite queues */}
      {finiteResults && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #eee" }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Balking (Finite Queue):</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingLeft: 12 }}>
            <div>
              <span style={{ color: "#666" }}>Average balking probability: </span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{(finiteResults.Pb * 100).toFixed(2)}%</span>
            </div>
            <div>
              <span style={{ color: "#666" }}>Average effective arrival rate: </span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{finiteResults.R.toFixed(2)} / {timeUnit}</span>
            </div>
            <div>
              <span style={{ color: "#666" }}>Average balking rate: </span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{finiteResults.RiPb.toFixed(2)} / {timeUnit}</span>
            </div>
          </div>
        </div>
      )}

      {/* Probabilities */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #eee" }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Probabilities:</div>
        <div style={{ paddingLeft: 12, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* P(wait > t) - only for infinite queues */}
          {infiniteResults && (
            <div>
              <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#666" }}>Probability that a customer waits more than</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={t || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return setT(0);
                    const v = Number(raw);
                    if (!Number.isFinite(v) || v < 0) return;
                    setT(v);
                  }}
                  style={{
                    width: 80,
                    padding: "4px 8px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                  aria-label="Time threshold"
                />
                <span style={{ color: "#666" }}>{timeUnit}:</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>
                  {infiniteResults.P_wait_gt_t !== undefined
                    ? (infiniteResults.P_wait_gt_t * 100).toFixed(2)
                    : "0.00"}%
                </span>
              </div>
            </div>
          )}

          {/* P(queue > Q) - for both finite and infinite queues */}
          <div>
            <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#666" }}>Probability that more than</span>
              <input
                type="number"
                min="0"
                step="1"
                value={Q || ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return setQ(0);
                  const v = Number(raw);
                  if (!Number.isFinite(v) || v < 0) return;
                  setQ(Math.round(v));
                }}
                style={{
                  width: 80,
                  padding: "4px 8px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontSize: 14,
                }}
                aria-label="Queue length threshold"
              />
              <span style={{ color: "#666" }}>customers wait in line:</span>
            </div>
            <div style={{ paddingLeft: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                {results.P_q_gt_Q !== undefined
                  ? (results.P_q_gt_Q * 100).toFixed(2)
                  : "0.00"}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PROBABILITY DISTRIBUTION TABLE (for finite queues only) */}
      {queueType === "finite" && results && "stateProbabilities" in results && results.stateProbabilities && (
        <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
          <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>Probability Distribution:</h2>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            <strong>n</strong> = total number of customers in the system
            <br />
            <strong>q</strong> = number of customers in the waiting line
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #333", backgroundColor: "#f3f4f6" }}>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>n</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>P(n)</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>Cumulative</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>q</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>P(q)</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cumulativeN = 0;
                  const qProbs: Map<number, number> = new Map();

                  // Calculate P(q) by summing P(n) for all n that result in the same q
                  results.stateProbabilities!.forEach((pn: number, n: number) => {
                    const q = Math.max(0, n - c);
                    qProbs.set(q, (qProbs.get(q) || 0) + pn);
                  });

                  // Sort q values
                  const sortedQs = Array.from(qProbs.keys()).sort((a, b) => a - b);
                  const qCumulatives = new Map<number, number>();
                  let cumulativeQ = 0;
                  sortedQs.forEach(q => {
                    cumulativeQ += qProbs.get(q)!;
                    qCumulatives.set(q, cumulativeQ);
                  });

                  return results.stateProbabilities!.map((pn: number, n: number) => {
                    cumulativeN += pn;
                    const q = Math.max(0, n - c);
                    const pq = qProbs.get(q);
                    const cumulativeQVal = qCumulatives.get(q);

                    // Only show q, P(q), and Cumulative for the first occurrence of each q value
                    const showQ = n === 0 || Math.max(0, n - 1 - c) !== q;

                    return (
                      <tr key={n} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{n}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{pn.toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{cumulativeN.toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{showQ ? q : ""}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{showQ && pq !== undefined ? pq.toFixed(4) : ""}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{showQ && cumulativeQVal !== undefined ? cumulativeQVal.toFixed(4) : ""}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
