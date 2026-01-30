/**
 * Queue modeling: steady-state M/M/c queues (finite capacity with balking, and infinite capacity).
 *
 * This is a TypeScript port of the Python queue model that replaces the 'Queue.xls' spreadsheet.
 *
 * Inputs:
 * - c: number of identical servers (int >= 1)
 * - K: queue capacity (finite model only; int >= 0). Total system capacity N = K + c.
 * - arrivalRate (Ri): arrival rate λ (customers per time unit)
 * - serviceRate (Rp): service rate μ per server (customers per time unit) = 1/Tp
 * - Q: threshold for "probability of more than Q waiting"
 * - t: time threshold for "probability of waiting more than t" (in same time units as Ri)
 *
 * NOTE: Keep arrival and service rates in the same time units (per day, per hour, etc.).
 */

// ----------------------------- Helper Functions -----------------------------

/**
 * Sum_{k=0..m} r^k, stable near r=1.
 */
function geomSum(r: number, m: number): number {
  if (Math.abs(1 - r) < 1e-12) {
    return m + 1.0;
  }
  return (1 - Math.pow(r, m + 1)) / (1 - r);
}

/**
 * Sum_{k=1..m} k * r^k, stable near r=1.
 */
function geomWeightedSum(r: number, m: number): number {
  if (m <= 0) {
    return 0.0;
  }
  if (Math.abs(1 - r) < 1e-12) {
    return (m * (m + 1)) / 2.0;
  }
  // Standard closed form
  return (r * (1 - (m + 1) * Math.pow(r, m) + m * Math.pow(r, m + 1))) / Math.pow(1 - r, 2);
}

/**
 * Factorial function with memoization for better performance
 */
const factorialCache: number[] = [1]; // 0! = 1

function factorial(n: number): number {
  if (n < 0) throw new Error("Factorial not defined for negative numbers");
  if (n === 0 || n === 1) return 1;

  // Use cached value if available
  if (factorialCache[n]) {
    return factorialCache[n];
  }

  // Calculate and cache
  let result = factorialCache[factorialCache.length - 1];
  for (let i = factorialCache.length; i <= n; i++) {
    result *= i;
    factorialCache[i] = result;
  }

  return factorialCache[n];
}

// ----------------------------- Type Definitions -----------------------------

export interface FiniteQueueResult {
  /** Average rate joining the system */
  R: number;
  /** Average rate leaving without service */
  RiPb: number;
  /** Fraction/customers who balk (probability system is full) */
  Pb: number;
  /** Average number in the waiting line */
  Ii: number;
  /** Average waiting time in the queue */
  Ti: number;
  /** Average number being served */
  Ip: number;
  /** Average utilization of servers */
  Utilization: number;
  /** Average number in the system */
  I: number;
  /** Average time in the system */
  T: number;
  /** Probability of more than Q customers waiting (optional) */
  P_q_gt_Q?: number;
  /** State probabilities P(n) for n=0 to N */
  stateProbabilities?: number[];
}

export interface InfiniteQueueResult {
  /** Average number in the waiting line */
  Ii: number;
  /** Average waiting time in the queue */
  Ti: number;
  /** Average number being served */
  Ip: number;
  /** Average utilization of servers */
  Utilization: number;
  /** Average number in the system */
  I: number;
  /** Average time in the system */
  T: number;
  /** Probability an arrival must wait (all servers busy) */
  Pw: number;
  /** Probability of more than Q customers waiting (optional) */
  P_q_gt_Q?: number;
  /** Probability of waiting more than t time units (optional) */
  P_wait_gt_t?: number;
}

// ----------------------------- Finite capacity: M/M/c/K -----------------------------

export interface FiniteQueueParams {
  /** Number of servers */
  c: number;
  /** Queue capacity (total system capacity = K + c) */
  K: number;
  /** Arrival rate λ (customers per time unit) */
  arrivalRate: number;
  /** Service rate μ per server (customers per time unit) */
  serviceRate: number;
  /** Optional: threshold for P(queue > Q) */
  Q?: number;
}

/**
 * Finite-capacity M/M/c/K queue (balking when system is full).
 *
 * Returns metrics for a queueing system with:
 * - Poisson arrivals
 * - Exponential service times
 * - c identical servers
 * - Maximum queue capacity K (customers balk when system is full)
 *
 * @throws Error if c < 1 or K < 0
 */
export function mmckFinite({
  c,
  K,
  arrivalRate,
  serviceRate,
  Q,
}: FiniteQueueParams): FiniteQueueResult {
  if (c < 1 || K < 0) {
    throw new Error("c must be >= 1 and K must be >= 0");
  }

  const lam = arrivalRate;
  const mu = serviceRate;
  const a = lam / mu; // λ/μ
  const rho = lam / (c * mu); // traffic intensity per server
  const N = c + K; // total system capacity

  // Normalizing constant P0
  let sum0 = 0;
  for (let n = 0; n < c; n++) {
    sum0 += Math.pow(a, n) / factorial(n);
  }

  const term = (Math.pow(a, c) / factorial(c)) * geomSum(rho, K);
  const P0 = 1.0 / (sum0 + term);

  // State probabilities
  function Pn(n: number): number {
    if (n < c) {
      return P0 * Math.pow(a, n) / factorial(n);
    }
    const m = n - c;
    return (P0 * Math.pow(a, c) / factorial(c)) * Math.pow(rho, m);
  }

  // Full-system probability (balking fraction)
  const Pb = Pn(N);

  // Effective throughput (arrivals that join) and balking rate
  const R = lam * (1 - Pb);
  const RiPb = lam * Pb;

  // Average number waiting in queue
  const coeff = (P0 * Math.pow(a, c)) / factorial(c);
  const Ii = coeff * geomWeightedSum(rho, K);

  // Average number in service
  const Ip = R / mu;
  const Utilization = Ip / c;

  // Totals and times via Little's Law
  const I = Ii + Ip;
  const Ti = R > 0 ? Ii / R : 0.0;
  const T = R > 0 ? I / R : 0.0;

  // Probability of more than Q waiting (optional)
  let P_q_gt_Q: number | undefined = undefined;
  if (Q !== undefined) {
    if (Q >= K) {
      P_q_gt_Q = 0.0;
    } else {
      // sum_{m=Q+1..K} rho^m
      const tail = geomSum(rho, K) - geomSum(rho, Q);
      P_q_gt_Q = coeff * tail;
    }
  }

  // Calculate state probabilities for all states n=0 to N
  const stateProbabilities: number[] = [];
  for (let n = 0; n <= N; n++) {
    stateProbabilities.push(Pn(n));
  }

  const result: FiniteQueueResult = {
    R,
    RiPb,
    Pb,
    Ii,
    Ti,
    Ip,
    Utilization,
    I,
    T,
    stateProbabilities,
  };

  if (P_q_gt_Q !== undefined) {
    result.P_q_gt_Q = P_q_gt_Q;
  }

  return result;
}

// ----------------------------- Infinite capacity: M/M/c -----------------------------

export interface InfiniteQueueParams {
  /** Number of servers */
  c: number;
  /** Arrival rate λ (customers per time unit) */
  arrivalRate: number;
  /** Service rate μ per server (customers per time unit) */
  serviceRate: number;
  /** Optional: threshold for P(queue > Q) */
  Q?: number;
  /** Optional: time threshold for P(wait > t) */
  t?: number;
}

/**
 * Infinite-capacity M/M/c queue.
 *
 * Returns metrics for a queueing system with:
 * - Poisson arrivals
 * - Exponential service times
 * - c identical servers
 * - Infinite queue capacity
 *
 * @throws Error if c < 1 or system is unstable (ρ >= 1)
 */
export function mmcInfinite({
  c,
  arrivalRate,
  serviceRate,
  Q,
  t,
}: InfiniteQueueParams): InfiniteQueueResult {
  if (c < 1) {
    throw new Error("c must be >= 1");
  }

  const lam = arrivalRate;
  const mu = serviceRate;
  const a = lam / mu;
  const rho = lam / (c * mu);

  if (rho >= 1) {
    throw new Error("System must be stable: arrivalRate < c * serviceRate");
  }

  // Normalizing constant P0
  let sum0 = 0;
  for (let n = 0; n < c; n++) {
    sum0 += Math.pow(a, n) / factorial(n);
  }

  const termc = (Math.pow(a, c) / factorial(c)) * (1 / (1 - rho));
  const P0 = 1.0 / (sum0 + termc);

  // Standard M/M/c results
  const Lq = (P0 * Math.pow(a, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2)); // average in queue
  const Wq = Lq / lam; // average wait in queue
  const Ip = a; // average being served
  const Utilization = rho;
  const L = Lq + Ip; // average in system
  const W = Wq + 1 / mu; // average time in system

  // Probability an arrival has to wait (all servers busy)
  const Pw = (Math.pow(a, c) / (factorial(c) * (1 - rho))) * P0;

  const result: InfiniteQueueResult = {
    Ii: Lq,
    Ti: Wq,
    Ip,
    Utilization,
    I: L,
    T: W,
    Pw,
  };

  // Probability of more than Q customers waiting (optional)
  if (Q !== undefined) {
    // Tail is geometric with ratio rho
    const tail = Math.pow(rho, Q + 1) / (1 - rho);
    result.P_q_gt_Q = (P0 * Math.pow(a, c) / factorial(c)) * tail;
  }

  // Probability of waiting more than t time units (optional)
  if (t !== undefined && t >= 0) {
    const rate = c * mu - lam; // exponential tail rate for non-preemptive M/M/c
    result.P_wait_gt_t = Pw * Math.exp(-rate * t);
  }

  return result;
}

// ----------------------------- Priority Classes: M/M/c with non-preemptive priorities -----------------------------

export interface PriorityClassResult {
  /** Average number in queue for this priority class */
  Ii_k: number;
  /** Average wait time for this priority class */
  Ti_k: number;
}

export interface PriorityQueueParams {
  /** Number of servers */
  c: number;
  /** Arrival rate λ (customers per time unit) */
  arrivalRate: number;
  /** Service rate μ per server (customers per time unit) */
  serviceRate: number;
  /** Array of fractions for each priority class (should sum to ~1.0) */
  classFractions: number[];
}

export interface PriorityQueueResult {
  /** Results for each priority class (index 0 = highest priority) */
  classes: PriorityClassResult[];
  /** Total Ii across all classes */
  Ii_total: number;
}

/**
 * Non-preemptive priority M/M/c queue.
 *
 * Calculates wait times and queue lengths for each priority class in a
 * non-preemptive priority system. Higher priority customers (lower index)
 * are served first when a server becomes available, but do not interrupt
 * service of lower priority customers.
 *
 * Based on formulas from Taha's Operations Research textbook.
 *
 * @throws Error if system is unstable (ρ >= 1)
 */
export function mmcPriority({
  c,
  arrivalRate,
  serviceRate,
  classFractions,
}: PriorityQueueParams): PriorityQueueResult {
  const lam = arrivalRate;
  const mu = serviceRate;
  const rho = lam / (c * mu);

  if (rho >= 1) {
    throw new Error("System must be stable: arrivalRate < c * serviceRate");
  }

  // Get overall M/M/c queue metrics (no priorities)
  const overallResult = mmcInfinite({ c, arrivalRate: lam, serviceRate: mu });
  const Ii_total = overallResult.Ii;

  // Calculate priority class metrics
  const classes: PriorityClassResult[] = [];
  let F_prev = 1.0; // F(0) = 1

  for (let k = 0; k < classFractions.length; k++) {
    const fraction_k = classFractions[k];

    // F(k) = F(k-1) - fraction(k) * ρ
    const F_k = F_prev - fraction_k * rho;

    // Ii(k) calculation differs for k=0 vs k>0
    let Ii_k: number;
    if (k === 0) {
      // Ii(1) = Ii_total * fraction(1) * (1 - ρ) / F(1)
      Ii_k = (Ii_total * fraction_k * (1 - rho)) / F_k;
    } else {
      // Ii(k) = Ii_total * fraction(k) * (1 - ρ) / (F(k) * F(k-1))
      Ii_k = (Ii_total * fraction_k * (1 - rho)) / (F_k * F_prev);
    }

    // Ti(k) = Ii(k) / (fraction(k) * λ)
    // Protect against division by zero if fraction is 0
    const Ti_k = fraction_k > 0 ? Ii_k / (fraction_k * lam) : 0;

    classes.push({ Ii_k, Ti_k });

    // Update F_prev for next iteration
    F_prev = F_k;
  }

  return {
    classes,
    Ii_total,
  };
}

// ----------------------------- Quick self-test / examples -----------------------------

if (import.meta.env.DEV) {
  // Example 1 (finite): c=2, K=0, Ri=45, Rp=25 -> balking fraction ~36.65%
  console.log("Example 1 (finite, c=2, K=0, Ri=45, Rp=25):");
  console.log(mmckFinite({ c: 2, K: 0, arrivalRate: 45, serviceRate: 25 }));

  // Example 2 (infinite): c=2, Ri=45, Rp=25 -> Ii ~ 7.674, Ti ~ 0.1705 days
  console.log("\nExample 2 (infinite, c=2, Ri=45, Rp=25):");
  console.log(mmcInfinite({ c: 2, arrivalRate: 45, serviceRate: 25 }));

  // Example 3 (priority): c=2, Ri=45, Rp=24, fractions=[0.2, 0.8, 0, 0]
  console.log("\nExample 3 (priority, c=2, Ri=45, Rp=24, fractions=[0.2, 0.8, 0, 0]):");
  console.log(mmcPriority({ c: 2, arrivalRate: 45, serviceRate: 24, classFractions: [0.2, 0.8, 0, 0] }));
}
