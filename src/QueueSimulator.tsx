import { useState, useEffect, useRef } from "react";

interface Customer {
  id: number;
  arrivalTime: number;
  serviceTime: number;
  startServiceTime?: number;
  endServiceTime?: number;
  serverId?: number;
  color: string;
}

interface QueueSimulatorProps {
  timeUnit: string;
}

export default function QueueSimulator({ timeUnit }: QueueSimulatorProps) {
  // Simulation parameters
  const [numServers, setNumServers] = useState<number>(2);
  const [arrivalRate, setArrivalRate] = useState<number>(1); // customers per time unit
  const [serviceRate, setServiceRate] = useState<number>(1.5); // customers per time unit per server
  const [cvArrival, setCvArrival] = useState<number>(1); // Coefficient of variation for arrivals (0-1)
  const [cvService, setCvService] = useState<number>(1); // Coefficient of variation for service (0-1)

  // Simulation state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [servers, setServers] = useState<(Customer | null)[]>(Array(numServers).fill(null));
  const [queue, setQueue] = useState<Customer[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalArrived, setTotalArrived] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [queueHistory, setQueueHistory] = useState<{ time: number; queueLength: number }[]>([]); // Simulation speed multiplier

  const nextCustomerId = useRef<number>(1);
  const nextArrivalTime = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const queueRef = useRef<Customer[]>([]);
  const serversRef = useRef<(Customer | null)[]>(Array(numServers).fill(null));

  // Generate random time based on coefficient of variation
  // CV = 0: deterministic (fixed time)
  // CV = 1: exponential (M/M/c)
  const generateRandomTime = (mean: number, cv: number): number => {
    if (cv === 0) {
      return mean; // Deterministic
    } else if (cv === 1) {
      // Exponential distribution
      return -Math.log(1 - Math.random()) * mean;
    } else {
      // Interpolate between deterministic and exponential
      const deterministic = mean;
      const exponential = -Math.log(1 - Math.random()) * mean;
      return deterministic * (1 - cv) + exponential * cv;
    }
  };

  // Generate customer colors
  const generateColor = (): string => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Reset simulation
  const resetSimulation = () => {
    currentTimeRef.current = 0;
    queueRef.current = [];
    serversRef.current = Array(numServers).fill(null);
    setCurrentTime(0);
    setServers(Array(numServers).fill(null));
    setQueue([]);
    setCompletedCount(0);
    setTotalArrived(0);
    setQueueHistory([]);
    nextCustomerId.current = 1;
    nextArrivalTime.current = 0;
    setIsRunning(false);
  };

  // Update servers array when numServers changes
  useEffect(() => {
    const newServers = Array(numServers).fill(null);
    for (let i = 0; i < Math.min(serversRef.current.length, numServers); i++) {
      newServers[i] = serversRef.current[i];
    }
    serversRef.current = newServers;
    setServers(newServers);
  }, [numServers]);

  // Simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Update time
      currentTimeRef.current += 0.1 * speed;
      const newTime = currentTimeRef.current;

      // Generate new arrivals
      while (newTime >= nextArrivalTime.current) {
        const interarrivalTime = generateRandomTime(1 / arrivalRate, cvArrival);
        nextArrivalTime.current += interarrivalTime;

        const serviceTime = generateRandomTime(1 / serviceRate, cvService);
        const newCustomer: Customer = {
          id: nextCustomerId.current++,
          arrivalTime: newTime,
          serviceTime,
          color: generateColor(),
        };

        queueRef.current.push(newCustomer);
        setTotalArrived(prev => prev + 1);
      }

      let completions = 0;

      // Check for completed service
      for (let i = 0; i < serversRef.current.length; i++) {
        const customer = serversRef.current[i];
        if (customer && customer.endServiceTime && newTime >= customer.endServiceTime) {
          completions++;
          serversRef.current[i] = null;
        }
      }

      // Assign waiting customers to free servers
      for (let i = 0; i < serversRef.current.length && queueRef.current.length > 0; i++) {
        if (serversRef.current[i] === null) {
          const customer = queueRef.current.shift()!;
          customer.startServiceTime = newTime;
          customer.endServiceTime = newTime + customer.serviceTime;
          customer.serverId = i;
          serversRef.current[i] = customer;
        }
      }

      // Update React state for rendering
      setCurrentTime(newTime);
      setQueue([...queueRef.current]);
      setServers([...serversRef.current]);
      if (completions > 0) {
        setCompletedCount(prev => prev + completions);
      }

      // Record queue history (sample every 0.5 time units to avoid too many points)
      if (Math.floor(newTime * 2) > Math.floor((newTime - 0.1 * speed) * 2)) {
        setQueueHistory(prev => [...prev, { time: newTime, queueLength: queueRef.current.length }]);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isRunning, speed, arrivalRate, serviceRate, cvArrival, cvService]);

  return (
    <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Simulator</h2>

      {/* Controls - First row: Arrival rate, Service rate, Servers */}
      <div style={{ marginBottom: 12, display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Arrival rate */}
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Arrival rate (Rᵢ):
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={arrivalRate || ""}
            onChange={(e) => setArrivalRate(Number(e.target.value) || 0)}
            disabled={isRunning}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
          />
        </div>

        {/* Service rate */}
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Service rate (Tₚ):
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={serviceRate || ""}
            onChange={(e) => setServiceRate(Number(e.target.value) || 0)}
            disabled={isRunning}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
          />
        </div>

        {/* Servers slider */}
        <div style={{ flex: "1", minWidth: 200, marginLeft: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Servers (c): {numServers}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={numServers}
            onChange={(e) => setNumServers(Number(e.target.value))}
            disabled={isRunning}
            style={{ width: "100%", cursor: isRunning ? "not-allowed" : "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginTop: 4 }}>
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Controls - Second row: CV arrivals, CV service */}
      <div style={{ marginBottom: 20, display: "flex", gap: 24 }}>
        {/* CV arrivals slider */}
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            CV arrivals: {cvArrival.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={cvArrival}
            onChange={(e) => setCvArrival(Number(e.target.value))}
            disabled={isRunning}
            style={{ width: "100%", cursor: isRunning ? "not-allowed" : "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginTop: 4 }}>
            <span>0</span>
            <span>1</span>
          </div>
        </div>

        {/* CV service slider */}
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            CV service: {cvService.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={cvService}
            onChange={(e) => setCvService(Number(e.target.value))}
            disabled={isRunning}
            style={{ width: "100%", cursor: isRunning ? "not-allowed" : "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginTop: 4 }}>
            <span>0</span>
            <span>1</span>
          </div>
        </div>
      </div>

      {/* Action buttons and Speed control */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: isRunning ? "#ef4444" : "#10b981",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetSimulation}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#6b7280",
            color: "white",
            cursor: "pointer",
          }}
        >
          Reset
        </button>

        {/* Speed slider */}
        <div style={{ flex: "0 0 250px", marginLeft: 16 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
            Speed: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666" }}>
            <span>0.5x</span>
            <span>5x</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 20, display: "flex", gap: 20, fontSize: 14, flexWrap: "wrap" }}>
        <div>
          <strong>Time:</strong> {currentTime.toFixed(1)} {timeUnit}
        </div>
        <div>
          <strong>Arrived:</strong> {totalArrived}
        </div>
        <div>
          <strong>In Queue:</strong> {queue.length}
        </div>
        <div>
          <strong>In Service:</strong> {servers.filter(s => s !== null).length}
        </div>
        <div>
          <strong>Completed:</strong> {completedCount}
        </div>
        <div>
          <strong>In System:</strong> {queue.length + servers.filter(s => s !== null).length}
        </div>
      </div>

      {/* Visualization - Classic M/M/c Layout */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9fafb" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* Waiting Queue - Wraps if too long */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: "1 1 auto", minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>Waiting Queue →</div>
            <div style={{
              display: "flex",
              gap: 4,
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              minHeight: 40,
              alignItems: "flex-start",
              maxWidth: "600px",
            }}>
              {queue.slice().reverse().map((customer) => (
                <div
                  key={customer.id}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: customer.color,
                    border: "2px solid white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "white",
                    fontWeight: 600,
                  }}
                  title={`Customer ${customer.id}`}
                >
                  {customer.id}
                </div>
              ))}
            </div>
          </div>

          {/* Arrow pointing to servers */}
          <div style={{ fontSize: 24, color: "#666", flexShrink: 0 }}>→</div>

          {/* Servers - Vertical column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#666", textAlign: "center" }}>
              Servers
            </div>
            {servers.map((customer, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: 120,
                  height: 50,
                  border: "2px solid #ccc",
                  borderRadius: 8,
                  background: customer ? "#dbeafe" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  fontSize: 12,
                  boxShadow: customer ? "0 2px 6px rgba(59, 130, 246, 0.2)" : "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontWeight: 600, color: "#666" }}>S{idx + 1}</div>
                {customer ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: customer.color,
                      border: "2px solid white",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "white",
                      fontWeight: 600,
                    }}
                    title={`Customer ${customer.id}`}
                  >
                    {customer.id}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>idle</div>
                )}
              </div>
            ))}
          </div>

          {/* Arrow pointing to exit */}
          <div style={{ fontSize: 24, color: "#666", flexShrink: 0 }}>→</div>

          {/* Exit */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Exit</div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#10b981",
              width: 80,
              height: 80,
              border: "3px solid #10b981",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f0fdf4",
            }}>
              {completedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Queue Length Over Time Chart */}
      {queueHistory.length > 1 && (
        <div style={{ marginTop: 20, border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9fafb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Queue Length Over Time</h3>
            {/* Legend */}
            <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 3, background: "#3b82f6" }}></div>
                <span>Number of jobs in system (queue+service)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 0, borderTop: "2px dashed #ef4444" }}></div>
                <span>Average # in system</span>
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 200, position: "relative" }}>
            <svg width="100%" height="200" style={{ border: "1px solid #e5e7eb", borderRadius: 4, background: "white" }}>
              {(() => {
                const currentTime = queueHistory[queueHistory.length - 1].time;

                // Calculate rolling 35-minute window (shows 30 min of data + 5 min buffer)
                // First 30 minutes: show [0, 35]
                // After 30 minutes: slide window by 10 minutes every 10 minutes
                // e.g., [10, 45], [20, 55], [30, 65], etc.
                let windowStart: number;
                let windowEnd: number;

                if (currentTime <= 30) {
                  windowStart = 0;
                  windowEnd = 35;
                } else {
                  // After 30 minutes, slide the window
                  const intervals = Math.floor((currentTime - 30) / 10);
                  windowStart = (intervals + 1) * 10;
                  windowEnd = windowStart + 35;
                }

                // Filter data to show only current window
                const visibleHistory = queueHistory.filter(h => h.time >= windowStart && h.time <= windowEnd);

                const maxQueue = Math.max(...queueHistory.map(h => h.queueLength), 1);
                const width = 1000; // SVG units
                const height = 180;
                const padding = { top: 10, right: 20, bottom: 30, left: 40 };

                const xScale = (time: number) => padding.left + (((time - windowStart) / 35) * (width - padding.left - padding.right));
                const yScale = (queueLength: number) => height - padding.bottom - ((queueLength / maxQueue) * (height - padding.top - padding.bottom));

                // X-axis ticks every 5 minutes
                const xTicks: number[] = [];
                for (let t = windowStart; t <= windowEnd; t += 5) {
                  xTicks.push(t);
                }

                // Y-axis ticks
                const yTicks = [0, Math.ceil(maxQueue / 2), maxQueue];

                // Calculate 10-minute interval averages for COMPLETED intervals only
                const intervalAverages: { start: number; end: number; avgQueue: number }[] = [];
                const completedIntervals = Math.floor(currentTime / 10); // Only show averages for completed 10-min intervals

                for (let i = 0; i < completedIntervals; i++) {
                  const intervalStart = i * 10;
                  const intervalEnd = (i + 1) * 10;
                  const intervalData = queueHistory.filter(h => h.time >= intervalStart && h.time < intervalEnd);

                  if (intervalData.length > 0) {
                    const avgQueue = intervalData.reduce((sum, h) => sum + h.queueLength, 0) / intervalData.length;
                    intervalAverages.push({ start: intervalStart, end: intervalEnd, avgQueue });
                  }
                }

                // Create path data for line plot (only visible data)
                const pathData = visibleHistory.map((point, i) => {
                  const x = xScale(point.time);
                  const y = yScale(point.queueLength);
                  return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                }).join(' ');

                return (
                  <>
                    {/* Grid lines */}
                    {yTicks.map(tick => (
                      <line
                        key={`y-grid-${tick}`}
                        x1={padding.left}
                        y1={yScale(tick)}
                        x2={width - padding.right}
                        y2={yScale(tick)}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                      />
                    ))}

                    {/* X-axis grid lines */}
                    {xTicks.map(tick => (
                      <line
                        key={`x-grid-${tick}`}
                        x1={xScale(tick)}
                        y1={padding.top}
                        x2={xScale(tick)}
                        y2={height - padding.bottom}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                      />
                    ))}

                    {/* 10-minute interval averages (step functions) */}
                    {intervalAverages.map((interval, idx) => {
                      // Only show if within visible window
                      if (interval.end > windowStart && interval.start < windowEnd) {
                        const x1 = xScale(Math.max(interval.start, windowStart));
                        const x2 = xScale(Math.min(interval.end, windowEnd));
                        const y = yScale(interval.avgQueue);

                        return (
                          <line
                            key={`avg-${idx}`}
                            x1={x1}
                            y1={y}
                            x2={x2}
                            y2={y}
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            opacity="0.7"
                          />
                        );
                      }
                      return null;
                    })}

                    {/* Axes */}
                    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#9ca3af" strokeWidth="2" />
                    <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#9ca3af" strokeWidth="2" />

                    {/* Y-axis labels */}
                    {yTicks.map(tick => (
                      <text
                        key={`y-label-${tick}`}
                        x={padding.left - 8}
                        y={yScale(tick) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#666"
                      >
                        {tick}
                      </text>
                    ))}

                    {/* X-axis labels */}
                    {xTicks.map(tick => (
                      <text
                        key={`x-label-${tick}`}
                        x={xScale(tick)}
                        y={height - padding.bottom + 18}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#666"
                      >
                        {tick}
                      </text>
                    ))}

                    {/* Axis titles */}
                    <text x={padding.left + (width - padding.left - padding.right) / 2} y={height - 5} textAnchor="middle" fontSize="12" fill="#666" fontWeight="600">
                      Time ({timeUnit})
                    </text>
                    <text
                      x={-height / 2}
                      y={15}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#666"
                      fontWeight="600"
                      transform={`rotate(-90, 15, ${height / 2})`}
                    >
                      Customers in Queue
                    </text>

                    {/* Line plot */}
                    {visibleHistory.length > 0 && (
                      <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    )}

                    {/* Data points */}
                    {visibleHistory.map((point, i) => (
                      <circle
                        key={i}
                        cx={xScale(point.time)}
                        cy={yScale(point.queueLength)}
                        r="3"
                        fill="#3b82f6"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
        <strong>Note:</strong> CV (Coefficient of Variation) controls randomness.
        CV=0 means deterministic (fixed) times, CV=1 means exponential distribution (M/M/c).
      </div>
    </div>
  );
}
