import { useState, useEffect, useRef } from "react";

interface Customer {
  id: number;
  arrivalTime: number;
  serviceTime: number;
  startServiceTime?: number;
  endServiceTime?: number;
  serverId?: number;
  collarColor: string;
  furColor: string;
}

interface ArrivingDog {
  id: number;
  startTime: number;
  arrivalTime: number;
  collarColor: string;
  furColor: string;
}

interface QueueSimulatorProps {
  timeUnit: string;
}

// CSS keyframes for SVG dog animations (injected into document)
const injectStyles = () => {
  if (document.getElementById('dog-animations')) return;

  const style = document.createElement('style');
  style.id = 'dog-animations';
  style.textContent = `
    @keyframes tailWag {
      0%, 100% { transform: rotate(-20deg); }
      50% { transform: rotate(20deg); }
    }
    @keyframes legWalk {
      0%, 100% { transform: rotate(-15deg); }
      50% { transform: rotate(15deg); }
    }
    @keyframes legWalkBack {
      0%, 100% { transform: rotate(15deg); }
      50% { transform: rotate(-15deg); }
    }
    @keyframes headBob {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(3px) rotate(5deg); }
    }
    @keyframes happyBounce {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes happyTail {
      0%, 100% { transform: rotate(-30deg); }
      25% { transform: rotate(30deg); }
      50% { transform: rotate(-30deg); }
      75% { transform: rotate(30deg); }
    }
    @keyframes sitIdle {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-1px); }
    }
  `;
  document.head.appendChild(style);
};

export default function QueueSimulator({ timeUnit }: QueueSimulatorProps) {
  // Inject CSS animations on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Simulation parameters
  const [numServers, setNumServers] = useState<number>(2);
  const [arrivalRate, setArrivalRate] = useState<number>(1);
  const [arrivalRateStr, setArrivalRateStr] = useState<string>("1");
  const [serviceRate, setServiceRate] = useState<number>(1.5);
  const [serviceRateStr, setServiceRateStr] = useState<string>("1.5");
  const [cvArrival, setCvArrival] = useState<number>(1);
  const [cvService, setCvService] = useState<number>(1);

  // Simulation state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [servers, setServers] = useState<(Customer | null)[]>(Array(numServers).fill(null));
  const [queue, setQueue] = useState<Customer[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalArrived, setTotalArrived] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [queueHistory, setQueueHistory] = useState<{ time: number; queueLength: number }[]>([]);

  // Arriving dogs (walking toward queue)
  const [arrivingDogs, setArrivingDogs] = useState<ArrivingDog[]>([]);

  const nextCustomerId = useRef<number>(1);
  const nextArrivalTime = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const queueRef = useRef<Customer[]>([]);
  const serversRef = useRef<(Customer | null)[]>(Array(numServers).fill(null));
  const arrivingDogsRef = useRef<ArrivingDog[]>([]);

  const generateRandomTime = (mean: number, cv: number): number => {
    if (cv === 0) {
      return mean;
    } else if (cv === 1) {
      return -Math.log(1 - Math.random()) * mean;
    } else {
      const deterministic = mean;
      const exponential = -Math.log(1 - Math.random()) * mean;
      return deterministic * (1 - cv) + exponential * cv;
    }
  };

  const generateDogColors = (): { collarColor: string; furColor: string } => {
    // Dog collar colors - bright, visible
    const collarColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    // Dog fur colors - realistic dog coat colors
    const furColors = [
      "#d4a574", // Golden/tan
      "#8b6914", // Dark golden
      "#4a3728", // Brown
      "#2d2d2d", // Black
      "#f5f5dc", // Cream/white
      "#a0522d", // Sienna/reddish brown
      "#d2b48c", // Tan
      "#696969", // Gray
    ];
    return {
      collarColor: collarColors[Math.floor(Math.random() * collarColors.length)],
      furColor: furColors[Math.floor(Math.random() * furColors.length)],
    };
  };

  const resetSimulation = () => {
    currentTimeRef.current = 0;
    queueRef.current = [];
    serversRef.current = Array(numServers).fill(null);
    arrivingDogsRef.current = [];
    setCurrentTime(0);
    setServers(Array(numServers).fill(null));
    setQueue([]);
    setArrivingDogs([]);
    setCompletedCount(0);
    setTotalArrived(0);
    setQueueHistory([]);
    nextCustomerId.current = 1;
    nextArrivalTime.current = 0;
    setIsRunning(false);
  };

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
      currentTimeRef.current += 0.1 * speed;
      const newTime = currentTimeRef.current;

      // Generate new arrivals - create arriving dog 2 time units before arrival
      const walkTime = 2; // Dogs walk for 2 time units
      while (nextArrivalTime.current <= newTime + walkTime) {
        const arrivalTime = nextArrivalTime.current;

        // Only create if this arrival time doesn't already have a dog
        const existingDog = arrivingDogsRef.current.find(d => Math.abs(d.arrivalTime - arrivalTime) < 0.01);
        if (!existingDog) {
          const colors = generateDogColors();
          const newDog: ArrivingDog = {
            id: nextCustomerId.current++,
            startTime: Math.max(0, arrivalTime - walkTime),
            arrivalTime: arrivalTime,
            collarColor: colors.collarColor,
            furColor: colors.furColor,
          };
          arrivingDogsRef.current.push(newDog);
        }

        const interarrivalTime = generateRandomTime(1 / arrivalRate, cvArrival);
        nextArrivalTime.current += interarrivalTime;
      }

      // Check for dogs that have arrived (reached the queue)
      const arrivedDogs = arrivingDogsRef.current.filter(d => newTime >= d.arrivalTime);
      arrivingDogsRef.current = arrivingDogsRef.current.filter(d => newTime < d.arrivalTime);

      for (const dog of arrivedDogs) {
        const serviceTime = generateRandomTime(1 / serviceRate, cvService);
        const newCustomer: Customer = {
          id: dog.id,
          arrivalTime: dog.arrivalTime,
          serviceTime,
          collarColor: dog.collarColor,
          furColor: dog.furColor,
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

      // Update React state
      setCurrentTime(newTime);
      setQueue([...queueRef.current]);
      setServers([...serversRef.current]);
      setArrivingDogs([...arrivingDogsRef.current]);
      if (completions > 0) {
        setCompletedCount(prev => prev + completions);
      }

      if (Math.floor(newTime * 2) > Math.floor((newTime - 0.1 * speed) * 2)) {
        setQueueHistory(prev => [...prev, { time: newTime, queueLength: queueRef.current.length }]);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, speed, arrivalRate, serviceRate, cvArrival, cvService]);

  // SVG Dog component for sitting/waiting in queue
  const WaitingDog = ({ collarColor, furColor, index }: { collarColor: string; furColor: string; index: number }) => {
    // Darker shade for ear/detail
    const darkerFur = furColor === "#2d2d2d" ? "#1a1a1a" :
                      furColor === "#f5f5dc" ? "#e0e0c0" :
                      `color-mix(in srgb, ${furColor} 70%, black)`;

    return (
      <svg
        width="40"
        height="45"
        viewBox="0 0 40 45"
        style={{
          animation: "sitIdle 2s ease-in-out infinite",
          animationDelay: `${index * 0.2}s`,
        }}
      >
        {/* Body - sitting (oval, lower) */}
        <ellipse cx="20" cy="32" rx="12" ry="10" fill={furColor} />

        {/* Back leg (visible when sitting) */}
        <ellipse cx="14" cy="38" rx="5" ry="4" fill={darkerFur} />
        <ellipse cx="26" cy="38" rx="5" ry="4" fill={darkerFur} />

        {/* Front legs */}
        <rect x="12" y="32" width="5" height="10" rx="2" fill={furColor} />
        <rect x="23" y="32" width="5" height="10" rx="2" fill={furColor} />

        {/* Tail - wagging */}
        <g style={{ transformOrigin: "8px 28px", animation: "tailWag 0.5s ease-in-out infinite" }}>
          <ellipse cx="5" cy="26" rx="4" ry="6" fill={furColor} transform="rotate(-30 5 26)" />
        </g>

        {/* Head */}
        <circle cx="28" cy="18" r="10" fill={furColor} />

        {/* Ear */}
        <ellipse cx="22" cy="10" rx="4" ry="6" fill={darkerFur} transform="rotate(-20 22 10)" />
        <ellipse cx="34" cy="12" rx="4" ry="5" fill={darkerFur} transform="rotate(20 34 12)" />

        {/* Snout */}
        <ellipse cx="35" cy="20" rx="5" ry="4" fill={darkerFur} />

        {/* Nose */}
        <ellipse cx="38" cy="19" rx="2" ry="1.5" fill="#1a1a1a" />

        {/* Eyes */}
        <circle cx="26" cy="16" r="2" fill="#1a1a1a" />
        <circle cx="32" cy="15" r="2" fill="#1a1a1a" />
        <circle cx="26.5" cy="15.5" r="0.7" fill="white" />
        <circle cx="32.5" cy="14.5" r="0.7" fill="white" />

        {/* Collar */}
        <rect x="20" y="25" width="16" height="4" rx="2" fill={collarColor} />
        <circle cx="28" cy="29" r="2" fill="#ffd700" /> {/* Tag */}
      </svg>
    );
  };

  // SVG Dog eating from bowl component
  const EatingDog = ({ customer, currentTime }: { customer: Customer; currentTime: number }) => {
    const progress = customer.startServiceTime && customer.endServiceTime
      ? Math.min(1, (currentTime - customer.startServiceTime) / (customer.endServiceTime - customer.startServiceTime))
      : 0;
    const foodLevel = 1 - progress;

    const furColor = customer.furColor;
    const collarColor = customer.collarColor;
    const darkerFur = furColor === "#2d2d2d" ? "#1a1a1a" :
                      furColor === "#f5f5dc" ? "#e0e0c0" :
                      `color-mix(in srgb, ${furColor} 70%, black)`;

    return (
      <svg width="75" height="45" viewBox="0 0 75 45">
        {/* Tail - wagging while eating */}
        <g style={{ transformOrigin: "8px 22px", animation: "tailWag 0.4s ease-in-out infinite" }}>
          <ellipse cx="5" cy="20" rx="4" ry="6" fill={furColor} transform="rotate(-40 5 20)" />
        </g>

        {/* Body - standing/leaning forward */}
        <ellipse cx="22" cy="28" rx="14" ry="10" fill={furColor} />

        {/* Back legs */}
        <rect x="10" y="32" width="5" height="12" rx="2" fill={furColor} />
        <rect x="18" y="32" width="5" height="12" rx="2" fill={furColor} />

        {/* Front legs - slightly bent forward */}
        <rect x="28" y="30" width="5" height="14" rx="2" fill={furColor} transform="rotate(10 30 30)" />
        <rect x="34" y="30" width="5" height="14" rx="2" fill={furColor} transform="rotate(10 36 30)" />

        {/* Collar */}
        <rect x="30" y="22" width="12" height="4" rx="2" fill={collarColor} />

        {/* Head - bobbing down to eat */}
        <g style={{ transformOrigin: "48px 24px", animation: "headBob 0.5s ease-in-out infinite" }}>
          <circle cx="45" cy="24" r="10" fill={furColor} />

          {/* Ears */}
          <ellipse cx="38" cy="16" rx="4" ry="6" fill={darkerFur} transform="rotate(-10 38 16)" />
          <ellipse cx="50" cy="14" rx="4" ry="5" fill={darkerFur} transform="rotate(10 50 14)" />

          {/* Snout - pointing down toward bowl */}
          <ellipse cx="52" cy="28" rx="5" ry="4" fill={darkerFur} transform="rotate(20 52 28)" />

          {/* Nose */}
          <ellipse cx="56" cy="30" rx="2" ry="1.5" fill="#1a1a1a" />

          {/* Eyes - happy squint while eating */}
          <path d="M 42 22 Q 44 20 46 22" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          <path d="M 47 21 Q 49 19 51 21" stroke="#1a1a1a" strokeWidth="2" fill="none" />
        </g>

        {/* Food bowl */}
        <g transform="translate(55, 30)">
          {/* Bowl outer */}
          <path d="M 0 5 Q 0 15 10 15 Q 20 15 20 5 L 18 5 Q 18 13 10 13 Q 2 13 2 5 Z" fill="#a3a3a3" />
          {/* Bowl inner */}
          <ellipse cx="10" cy="5" rx="10" ry="4" fill="#d4d4d4" />
          {/* Food */}
          <ellipse cx="10" cy="5" rx={8 * foodLevel} ry={3 * foodLevel} fill="#92400e" />
        </g>
      </svg>
    );
  };

  // SVG Arriving/walking dog component
  const ArrivingDogComponent = ({ dog, currentTime }: { dog: ArrivingDog; currentTime: number }) => {
    const walkDuration = 2; // 2 time units to walk
    const progress = Math.min(1, Math.max(0, (currentTime - dog.startTime) / walkDuration));

    const furColor = dog.furColor;
    const collarColor = dog.collarColor;
    const darkerFur = furColor === "#2d2d2d" ? "#1a1a1a" :
                      furColor === "#f5f5dc" ? "#e0e0c0" :
                      `color-mix(in srgb, ${furColor} 70%, black)`;

    return (
      <div
        style={{
          position: "absolute",
          left: `${progress * 100}%`,
          transform: "translateX(-50%)",
          transition: "left 0.1s linear",
          bottom: 5,
        }}
      >
        <svg width="45" height="40" viewBox="0 0 45 40">
          {/* Tail - wagging while walking */}
          <g style={{ transformOrigin: "5px 18px", animation: "tailWag 0.3s ease-in-out infinite" }}>
            <ellipse cx="3" cy="16" rx="3" ry="5" fill={furColor} transform="rotate(-40 3 16)" />
          </g>

          {/* Body */}
          <ellipse cx="18" cy="20" rx="12" ry="8" fill={furColor} />

          {/* Back legs - animated walking */}
          <g style={{ transformOrigin: "12px 24px", animation: "legWalk 0.2s ease-in-out infinite" }}>
            <rect x="10" y="24" width="4" height="12" rx="2" fill={furColor} />
          </g>
          <g style={{ transformOrigin: "18px 24px", animation: "legWalkBack 0.2s ease-in-out infinite" }}>
            <rect x="16" y="24" width="4" height="12" rx="2" fill={furColor} />
          </g>

          {/* Front legs - animated walking */}
          <g style={{ transformOrigin: "24px 24px", animation: "legWalkBack 0.2s ease-in-out infinite" }}>
            <rect x="22" y="24" width="4" height="12" rx="2" fill={furColor} />
          </g>
          <g style={{ transformOrigin: "30px 24px", animation: "legWalk 0.2s ease-in-out infinite" }}>
            <rect x="28" y="24" width="4" height="12" rx="2" fill={furColor} />
          </g>

          {/* Collar */}
          <rect x="26" y="16" width="10" height="3" rx="1.5" fill={collarColor} />

          {/* Head - facing right */}
          <circle cx="35" cy="14" r="8" fill={furColor} />

          {/* Ears */}
          <ellipse cx="30" cy="7" rx="3" ry="5" fill={darkerFur} transform="rotate(-15 30 7)" />
          <ellipse cx="39" cy="8" rx="3" ry="4" fill={darkerFur} transform="rotate(15 39 8)" />

          {/* Snout */}
          <ellipse cx="42" cy="15" rx="4" ry="3" fill={darkerFur} />

          {/* Nose */}
          <ellipse cx="44" cy="14" rx="1.5" ry="1" fill="#1a1a1a" />

          {/* Eyes */}
          <circle cx="33" cy="12" r="1.5" fill="#1a1a1a" />
          <circle cx="38" cy="11" r="1.5" fill="#1a1a1a" />
          <circle cx="33.3" cy="11.5" r="0.5" fill="white" />
          <circle cx="38.3" cy="10.5" r="0.5" fill="white" />

          {/* Tongue - happy panting while walking */}
          <ellipse cx="43" cy="18" rx="1.5" ry="2" fill="#ff6b6b" />
        </svg>
      </div>
    );
  };

  // SVG Happy dog for exit area - bouncing with joy
  const HappyDog = () => {
    // Use a cheerful golden color for the happy exit dog
    const furColor = "#d4a574";
    const darkerFur = "#b8956a";
    const collarColor = "#10b981";

    return (
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        style={{ animation: "happyBounce 0.5s ease-in-out infinite" }}
      >
        {/* Tail - extra happy wagging */}
        <g style={{ transformOrigin: "8px 25px", animation: "happyTail 0.3s ease-in-out infinite" }}>
          <ellipse cx="5" cy="23" rx="4" ry="7" fill={furColor} transform="rotate(-30 5 23)" />
        </g>

        {/* Body */}
        <ellipse cx="22" cy="30" rx="13" ry="10" fill={furColor} />

        {/* Back legs */}
        <rect x="11" y="34" width="5" height="12" rx="2" fill={furColor} />
        <rect x="19" y="34" width="5" height="12" rx="2" fill={furColor} />

        {/* Front legs - slightly lifted in excitement */}
        <rect x="26" y="33" width="5" height="13" rx="2" fill={furColor} transform="rotate(-5 28 33)" />
        <rect x="32" y="32" width="5" height="14" rx="2" fill={furColor} transform="rotate(-8 34 32)" />

        {/* Collar */}
        <rect x="28" y="23" width="12" height="4" rx="2" fill={collarColor} />
        <circle cx="34" cy="27" r="2" fill="#ffd700" /> {/* Tag */}

        {/* Head */}
        <circle cx="38" cy="18" r="10" fill={furColor} />

        {/* Ears - perked up happy */}
        <ellipse cx="31" cy="9" rx="4" ry="6" fill={darkerFur} transform="rotate(-25 31 9)" />
        <ellipse cx="44" cy="10" rx="4" ry="5" fill={darkerFur} transform="rotate(25 44 10)" />

        {/* Snout */}
        <ellipse cx="46" cy="20" rx="5" ry="4" fill={darkerFur} />

        {/* Nose */}
        <ellipse cx="49" cy="19" rx="2" ry="1.5" fill="#1a1a1a" />

        {/* Happy eyes - curved happy squint */}
        <path d="M 34 15 Q 36 12 38 15" stroke="#1a1a1a" strokeWidth="2" fill="none" />
        <path d="M 40 14 Q 42 11 44 14" stroke="#1a1a1a" strokeWidth="2" fill="none" />

        {/* Big happy smile/tongue */}
        <ellipse cx="47" cy="24" rx="3" ry="4" fill="#ff6b6b" />

        {/* Sparkles around happy dog */}
        <text x="2" y="10" fontSize="8">✨</text>
        <text x="42" y="5" fontSize="6">✨</text>
      </svg>
    );
  };

  return (
    <div style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12, marginTop: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Simulator</h2>

      {/* Controls - First row: Arrival rate, Service rate, Servers */}
      <div style={{ marginBottom: 12, display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Arrival rate (Rᵢ):
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={arrivalRateStr}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "." || /^[0-9]*\.?[0-9]*$/.test(raw)) {
                setArrivalRateStr(raw);
                const v = Number(raw);
                if (raw !== "" && Number.isFinite(v)) setArrivalRate(v);
                if (raw === "") setArrivalRate(0);
              }
            }}
            disabled={isRunning}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
          />
        </div>

        <div style={{ flex: "0 0 160px" }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Service rate (1/Tₚ):
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={serviceRateStr}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "." || /^[0-9]*\.?[0-9]*$/.test(raw)) {
                setServiceRateStr(raw);
                const v = Number(raw);
                if (raw !== "" && Number.isFinite(v)) setServiceRate(v);
                if (raw === "") setServiceRate(0);
              }
            }}
            disabled={isRunning}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
          />
        </div>

        <div style={{ flex: "1", minWidth: 200, marginLeft: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Number of servers (c): {numServers}
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
        <div><strong>Time:</strong> {currentTime.toFixed(1)} {timeUnit}</div>
        <div><strong>Arrived:</strong> {totalArrived}</div>
        <div><strong>In Queue:</strong> {queue.length}</div>
        <div><strong>In Service:</strong> {servers.filter(s => s !== null).length}</div>
        <div><strong>Completed:</strong> {completedCount}</div>
        <div><strong>In System:</strong> {queue.length + servers.filter(s => s !== null).length}</div>
      </div>

      {/* Visualization - Dog Theme */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>

          {/* Arrival Lane - Dogs walking toward queue */}
          <div style={{
            flex: "1 1 200px",
            minWidth: 150,
            height: 60,
            background: "linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)",
            borderRadius: 8,
            position: "relative",
            border: "2px dashed #f59e0b",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", left: 8, fontSize: 11, color: "#92400e", fontWeight: 600, top: 2 }}>
              🦮 Arriving... ({arrivingDogs.length})
            </div>
            {arrivingDogs.filter(d => currentTime >= d.startTime).map(dog => (
              <ArrivingDogComponent key={dog.id} dog={dog} currentTime={currentTime} />
            ))}
          </div>

          {/* Entry Door */}
          <div style={{
            width: 8,
            height: 70,
            background: "linear-gradient(180deg, #78350f 0%, #451a03 100%)",
            borderRadius: 4,
            boxShadow: "2px 0 4px rgba(0,0,0,0.2)",
          }} />

          {/* Queue Area - Dogs waiting */}
          <div style={{
            flex: "1 1 auto",
            minWidth: 100,
            maxWidth: 400,
            minHeight: 70,
            background: "rgba(255,255,255,0.8)",
            borderRadius: 8,
            padding: "8px 12px",
            border: "2px solid #86efac",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
          }}>
            {queue.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>No dogs waiting</div>
            ) : (
              queue.slice().reverse().map((customer, idx) => (
                <WaitingDog key={customer.id} collarColor={customer.collarColor} furColor={customer.furColor} index={idx} />
              ))
            )}
          </div>

          {/* Arrow to servers */}
          <div style={{ fontSize: 20, color: "#16a34a" }}>➡️</div>

          {/* Servers - Dogs eating */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", textAlign: "center" }}>
              🍽️ Feeding Stations
            </div>
            {servers.map((customer, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: 100,
                  height: 55,
                  border: "2px solid #86efac",
                  borderRadius: 8,
                  background: customer ? "#fef9c3" : "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  fontSize: 12,
                  position: "relative",
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 2,
                  left: 6,
                  fontSize: 10,
                  color: "#666",
                  fontWeight: 600,
                }}>
                  S{idx + 1}
                </div>
                {customer ? (
                  <EatingDog customer={customer} currentTime={currentTime} />
                ) : (
                  <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                    🍽️ Empty
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Arrow to exit */}
          <div style={{ fontSize: 20, color: "#16a34a" }}>➡️</div>

          {/* Exit - Happy dogs */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexShrink: 0,
            background: "linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)",
            borderRadius: 12,
            padding: 12,
            border: "2px solid #60a5fa",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1e40af", marginBottom: 4 }}>
              Happy Dogs! 🎉
            </div>
            <HappyDog />
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#16a34a",
              marginTop: 4,
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
                <span># jobs waiting</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 0, borderTop: "2px dashed #ef4444" }}></div>
                <span>Average # jobs waiting</span>
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 200, position: "relative" }}>
            <svg width="100%" height="200" viewBox="0 0 1000 180" preserveAspectRatio="xMidYMid meet" style={{ border: "1px solid #e5e7eb", borderRadius: 4, background: "white" }}>
              {(() => {
                const currentTime = queueHistory[queueHistory.length - 1].time;

                let windowStart: number;
                let windowEnd: number;

                if (currentTime <= 30) {
                  windowStart = 0;
                  windowEnd = 35;
                } else {
                  const intervals = Math.floor((currentTime - 30) / 10);
                  windowStart = (intervals + 1) * 10;
                  windowEnd = windowStart + 35;
                }

                const visibleHistory = queueHistory.filter(h => h.time >= windowStart && h.time <= windowEnd);

                const maxQueue = Math.max(...queueHistory.map(h => h.queueLength), 1);
                const width = 1000;
                const height = 180;
                const padding = { top: 10, right: 40, bottom: 30, left: 40 };

                const xScale = (time: number) => padding.left + (((time - windowStart) / 35) * (width - padding.left - padding.right));
                const yScale = (queueLength: number) => height - padding.bottom - ((queueLength / maxQueue) * (height - padding.top - padding.bottom));

                const xTicks: number[] = [];
                for (let t = windowStart; t <= windowEnd; t += 5) {
                  xTicks.push(t);
                }

                const yTicks = [0, Math.ceil(maxQueue / 2), maxQueue];

                const intervalAverages: { start: number; end: number; avgQueue: number }[] = [];
                const completedIntervals = Math.floor(currentTime / 10);

                for (let i = 0; i < completedIntervals; i++) {
                  const intervalStart = i * 10;
                  const intervalEnd = (i + 1) * 10;
                  const intervalData = queueHistory.filter(h => h.time >= intervalStart && h.time < intervalEnd);

                  if (intervalData.length > 0) {
                    const avgQueue = intervalData.reduce((sum, h) => sum + h.queueLength, 0) / intervalData.length;
                    intervalAverages.push({ start: intervalStart, end: intervalEnd, avgQueue });
                  }
                }

                const pathData = visibleHistory.map((point, i) => {
                  const x = xScale(point.time);
                  const y = yScale(point.queueLength);
                  return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                }).join(' ');

                return (
                  <>
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

                    {intervalAverages.map((interval, idx) => {
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

                    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#9ca3af" strokeWidth="2" />
                    <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#9ca3af" strokeWidth="2" />

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

                    {visibleHistory.length > 0 && (
                      <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    )}

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
