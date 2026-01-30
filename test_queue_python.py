""" Test the original Python queue model """
import math
from typing import Dict, Optional

def _geom_sum(r: float, m: int) -> float:
    """Sum_{k=0..m} r^k, stable near r=1."""
    if abs(1 - r) < 1e-12:
        return m + 1.0
    return (1 - r**(m + 1)) / (1 - r)

def _geom_weighted_sum(r: float, m: int) -> float:
    """Sum_{k=1..m} k * r^k, stable near r=1."""
    if m <= 0:
        return 0.0
    if abs(1 - r) < 1e-12:
        return m * (m + 1) / 2.0
    return (r * (1 - (m + 1) * r**m + m * r**(m + 1))) / ((1 - r) ** 2)

def mmck_finite(c: int, K: int, arrival_rate: float, service_rate: float, Q: Optional[int] = None) -> Dict[str, float]:
    if c < 1 or K < 0:
        raise ValueError("c must be >=1 and K must be >=0")
    lam = float(arrival_rate)
    mu = float(service_rate)
    a = lam / mu
    rho = lam / (c * mu)
    N = c + K

    sum0 = sum((a**n) / math.factorial(n) for n in range(c))
    term = (a**c) / math.factorial(c) * _geom_sum(rho, K)
    P0 = 1.0 / (sum0 + term)

    def Pn(n: int) -> float:
        if n < c:
            return P0 * (a**n) / math.factorial(n)
        m = n - c
        return P0 * (a**c) / math.factorial(c) * (rho**m)

    Pb = Pn(N)
    R = lam * (1 - Pb)
    RiPb = lam * Pb

    coeff = P0 * (a**c) / math.factorial(c)
    Ii = coeff * _geom_weighted_sum(rho, K)

    Ip = R / mu
    Utilization = Ip / c
    I = Ii + Ip
    Ti = Ii / R if R > 0 else 0.0
    T = I / R if R > 0 else 0.0

    P_q_gt_Q = None
    if Q is not None:
        if Q >= K:
            P_q_gt_Q = 0.0
        else:
            tail = _geom_sum(rho, K) - _geom_sum(rho, Q)
            P_q_gt_Q = coeff * tail

    return {
        "R": R,
        "RiPb": RiPb,
        "Pb": Pb,
        "Ii": Ii,
        "Ti": Ti,
        "Ip": Ip,
        "Utilization": Utilization,
        "I": I,
        "T": T,
        **({"P_q_gt_Q": P_q_gt_Q} if P_q_gt_Q is not None else {}),
    }

def mmc_infinite(c: int, arrival_rate: float, service_rate: float, Q: Optional[int] = None, t: Optional[float] = None) -> Dict[str, float]:
    if c < 1:
        raise ValueError("c must be >=1")
    lam = float(arrival_rate)
    mu = float(service_rate)
    a = lam / mu
    rho = lam / (c * mu)
    if rho >= 1:
        raise ValueError("System must be stable: arrival_rate < c * service_rate")

    sum0 = sum((a**n) / math.factorial(n) for n in range(c))
    termc = (a**c) / math.factorial(c) * (1 / (1 - rho))
    P0 = 1.0 / (sum0 + termc)

    Lq = P0 * (a**c) * rho / (math.factorial(c) * (1 - rho)**2)
    Wq = Lq / lam
    Ip = a
    Utilization = rho
    L = Lq + Ip
    W = Wq + 1/mu

    Pw = (a**c) / (math.factorial(c) * (1 - rho)) * P0

    out = {
        "Ii": Lq,
        "Ti": Wq,
        "Ip": Ip,
        "Utilization": Utilization,
        "I": L,
        "T": W,
        "Pw": Pw,
    }

    if Q is not None:
        tail = (rho**(Q + 1)) / (1 - rho)
        out["P_q_gt_Q"] = P0 * (a**c) / math.factorial(c) * tail

    if t is not None and t >= 0:
        rate = c * mu - lam
        out["P_wait_gt_t"] = Pw * math.exp(-rate * t)

    return out

# Test Example 1: c=2, K=0, Ri=45, Rp=25
print("Example 1 (finite, c=2, K=0, Ri=45, Rp=25):")
result1 = mmck_finite(c=2, K=0, arrival_rate=45, service_rate=25)
print(f"  Pb (balking fraction): {result1['Pb']*100:.2f}%")
print(f"  Expected: ~36.65%")
print(f"  R (effective arrival rate): {result1['R']:.4f}")
print(f"  RiPb (balking rate): {result1['RiPb']:.4f}")
print(f"  Full results: {result1}")

# Test Example 2: c=2, Ri=45, Rp=25
print("\nExample 2 (infinite, c=2, Ri=45, Rp=25):")
result2 = mmc_infinite(c=2, arrival_rate=45, service_rate=25)
print(f"  Ii (avg in queue): {result2['Ii']:.3f}")
print(f"  Expected: ~7.674")
print(f"  Ti (avg wait time): {result2['Ti']:.4f}")
print(f"  Expected: ~0.1705")
print(f"  Full results: {result2}")
