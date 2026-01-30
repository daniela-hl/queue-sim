# Queue Simulator - Usage Guide

## Quick Start

1. **Install dependencies** (one time):
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production** (creates static files for distribution):
   ```bash
   npm run build
   ```

4. **Preview the production build**:
   ```bash
   npm run preview
   ```

## Queue Model API

The TypeScript queue model in `src/queueModel.ts` provides two main functions:

### Infinite Capacity Queue (M/M/c)

```typescript
import { mmcInfinite } from './queueModel';

const results = mmcInfinite({
  c: 2,                    // Number of servers
  arrivalRate: 45,         // λ (customers per time unit)
  serviceRate: 25,         // μ per server (customers per time unit)
  Q: 10,                   // Optional: threshold for P(queue > Q)
  t: 0.5,                  // Optional: threshold for P(wait > t)
});

console.log(results);
// {
//   Ii: 7.674,            // Average number in queue
//   Ti: 0.1705,           // Average wait time
//   Ip: 1.8,              // Average number being served
//   Utilization: 0.9,     // Server utilization (90%)
//   I: 9.474,             // Average number in system
//   T: 0.2105,            // Average time in system
//   Pw: 0.8526,           // Probability of waiting
//   P_q_gt_Q: ...,        // Prob. more than Q waiting (if Q provided)
//   P_wait_gt_t: ...      // Prob. wait > t (if t provided)
// }
```

### Finite Capacity Queue (M/M/c/K)

```typescript
import { mmckFinite } from './queueModel';

const results = mmckFinite({
  c: 2,                    // Number of servers
  K: 0,                    // Queue capacity (total capacity = c + K)
  arrivalRate: 45,         // λ (customers per time unit)
  serviceRate: 25,         // μ per server (customers per time unit)
  Q: 10,                   // Optional: threshold for P(queue > Q)
});

console.log(results);
// {
//   R: 28.507,            // Effective arrival rate
//   RiPb: 16.493,         // Balking rate
//   Pb: 0.3665,           // Balking probability (36.65%)
//   Ii: 0,                // Average number in queue
//   Ti: 0,                // Average wait time
//   Ip: 1.140,            // Average number being served
//   Utilization: 0.570,   // Server utilization
//   I: 1.140,             // Average number in system
//   T: 0.04,              // Average time in system
//   P_q_gt_Q: ...         // Prob. more than Q waiting (if Q provided)
// }
```

## Key Features

### ✅ Already Implemented

1. **M/M/c/K Queue Model** - Finite capacity with balking
2. **M/M/c Queue Model** - Infinite capacity
3. **Interactive UI** - Sliders and numeric inputs for all parameters
4. **Real-time Calculations** - Updates instantly as you adjust parameters
5. **Time Unit Selection** - Choose from seconds, minutes, hours, days, weeks, months, years
6. **Stability Detection** - Warns when system is unstable (ρ ≥ 1)
7. **Responsive Design** - Works on desktop, tablet, and mobile

### 📋 Next Steps (To Be Implemented)

1. **Visual Animation** - Show customers arriving, waiting in queue, and being served
2. **Offline Support** - Configure as PWA for offline use during exams
3. **Additional Metrics** - Optional Q and t threshold calculations in the UI
4. **Export Results** - Download calculations as PDF or CSV
5. **Presets** - Save and load common configurations
6. **Tutorial Mode** - Interactive guide for students

## Mathematical Notation

The app uses standard queueing theory notation:

- **λ (lambda)**: Arrival rate (customers per time unit)
- **μ (mu)**: Service rate per server (customers per time unit)
- **c**: Number of servers
- **K**: Queue capacity (finite queues only)
- **N**: Total system capacity = c + K
- **ρ (rho)**: Traffic intensity = λ / (c × μ)
  - System is stable when ρ < 1
- **Lq (Ii)**: Average number of customers in queue
- **Wq (Ti)**: Average waiting time in queue
- **L (I)**: Average number of customers in system
- **W (T)**: Average time in system
- **Pb**: Probability of balking (finite queues)
- **Pw**: Probability of waiting (infinite queues)

## Distribution

For exam use (offline access), after building:

```bash
npm run build
```

The `dist/` folder contains all files needed. Students can:
1. Download the entire `dist/` folder
2. Open `index.html` in any browser
3. Use completely offline (no internet required)

For easier distribution, you can create a single HTML file (see next implementation phase).

## Testing

The queue calculations have been verified against the original Excel spreadsheet:

**Example 1** (c=2, K=0, Ri=45, Rp=25):
- Balking fraction: 36.65% ✓

**Example 2** (c=2, Ri=45, Rp=25):
- Avg in queue (Ii): 7.674 ✓
- Avg wait time (Ti): 0.1705 ✓
