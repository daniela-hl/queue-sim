/**
 * Quick test to verify TypeScript queue model matches Python results
 * Run with: node test-queue.js
 */

// Simple JavaScript version of the queue model for testing
function geomSum(r, m) {
  if (Math.abs(1 - r) < 1e-12) return m + 1.0;
  return (1 - Math.pow(r, m + 1)) / (1 - r);
}

function geomWeightedSum(r, m) {
  if (m <= 0) return 0.0;
  if (Math.abs(1 - r) < 1e-12) return (m * (m + 1)) / 2.0;
  return (r * (1 - (m + 1) * Math.pow(r, m) + m * Math.pow(r, m + 1))) / Math.pow(1 - r, 2);
}

const factorialCache = [1];
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  if (factorialCache[n]) return factorialCache[n];
  let result = factorialCache[factorialCache.length - 1];
  for (let i = factorialCache.length; i <= n; i++) {
    result *= i;
    factorialCache[i] = result;
  }
  return factorialCache[n];
}

function mmckFinite({ c, K, arrivalRate, serviceRate, Q }) {
  const lam = arrivalRate;
  const mu = serviceRate;
  const a = lam / mu;
  const rho = lam / (c * mu);
  const N = c + K;

  let sum0 = 0;
  for (let n = 0; n < c; n++) {
    sum0 += Math.pow(a, n) / factorial(n);
  }

  const term = (Math.pow(a, c) / factorial(c)) * geomSum(rho, K);
  const P0 = 1.0 / (sum0 + term);

  function Pn(n) {
    if (n < c) return P0 * Math.pow(a, n) / factorial(n);
    const m = n - c;
    return (P0 * Math.pow(a, c) / factorial(c)) * Math.pow(rho, m);
  }

  const Pb = Pn(N);
  const R = lam * (1 - Pb);
  const RiPb = lam * Pb;
  const coeff = (P0 * Math.pow(a, c)) / factorial(c);
  const Ii = coeff * geomWeightedSum(rho, K);
  const Ip = R / mu;
  const Utilization = Ip / c;
  const I = Ii + Ip;
  const Ti = R > 0 ? Ii / R : 0.0;
  const T = R > 0 ? I / R : 0.0;

  let P_q_gt_Q;
  if (Q !== undefined) {
    if (Q >= K) {
      P_q_gt_Q = 0.0;
    } else {
      const tail = geomSum(rho, K) - geomSum(rho, Q);
      P_q_gt_Q = coeff * tail;
    }
  }

  return { R, RiPb, Pb, Ii, Ti, Ip, Utilization, I, T, P_q_gt_Q };
}

function mmcInfinite({ c, arrivalRate, serviceRate, Q, t }) {
  const lam = arrivalRate;
  const mu = serviceRate;
  const a = lam / mu;
  const rho = lam / (c * mu);

  if (rho >= 1) throw new Error("System unstable");

  let sum0 = 0;
  for (let n = 0; n < c; n++) {
    sum0 += Math.pow(a, n) / factorial(n);
  }

  const termc = (Math.pow(a, c) / factorial(c)) * (1 / (1 - rho));
  const P0 = 1.0 / (sum0 + termc);

  const Lq = (P0 * Math.pow(a, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2));
  const Wq = Lq / lam;
  const Ip = a;
  const Utilization = rho;
  const L = Lq + Ip;
  const W = Wq + 1 / mu;
  const Pw = (Math.pow(a, c) / (factorial(c) * (1 - rho))) * P0;

  let P_q_gt_Q;
  if (Q !== undefined) {
    const tail = Math.pow(rho, Q + 1) / (1 - rho);
    P_q_gt_Q = (P0 * Math.pow(a, c) / factorial(c)) * tail;
  }

  let P_wait_gt_t;
  if (t !== undefined && t >= 0) {
    const rate = c * mu - lam;
    P_wait_gt_t = Pw * Math.exp(-rate * t);
  }

  return { Ii: Lq, Ti: Wq, Ip, Utilization, I: L, T: W, Pw, P_q_gt_Q, P_wait_gt_t };
}

// Test Example 1: c=2, K=0, Ri=45, Rp=25 -> balking fraction ~36.65%
console.log("Example 1 (finite, c=2, K=0, Ri=45, Rp=25):");
const result1 = mmckFinite({ c: 2, K: 0, arrivalRate: 45, serviceRate: 25 });
console.log("  Pb (balking fraction):", (result1.Pb * 100).toFixed(2) + "%");
console.log("  Expected: ~36.65%");
console.log("  Full results:", result1);

// Test Example 2: c=2, Ri=45, Rp=25 -> Ii ~ 7.674, Ti ~ 0.1705 days
console.log("\nExample 2 (infinite, c=2, Ri=45, Rp=25):");
const result2 = mmcInfinite({ c: 2, arrivalRate: 45, serviceRate: 25 });
console.log("  Ii (avg in queue):", result2.Ii.toFixed(3));
console.log("  Expected: ~7.674");
console.log("  Ti (avg wait time):", result2.Ti.toFixed(4));
console.log("  Expected: ~0.1705");
console.log("  Full results:", result2);
