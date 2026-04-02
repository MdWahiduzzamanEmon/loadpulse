# LoadPulse

Visual API load testing dashboard with real-time animations. Test any REST API with 7 different test types, live charts, per-endpoint results, and detailed error breakdowns.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm](https://img.shields.io/npm/v/loadpulse-agent)
![Docker](https://img.shields.io/docker/v/emon424096/loadpulse-agent?label=docker)

## How It Works

```
Your Browser → Dashboard (Next.js) → Agent (Node.js) → Your API Server
                  UI only            fires requests      any REST API
```

The **dashboard** is the web UI — charts, animations, controls. The **agent** is a lightweight Node.js process that fires actual HTTP requests and streams results back via WebSocket.

## Quick Start

### 1. Start the Agent

**Option A: npx (recommended)**
```bash
npx loadpulse-agent
```

**Option B: Docker**
```bash
docker run -p 3050:3050 emon424096/loadpulse-agent
```

**Option C: From source**
```bash
git clone https://github.com/MdWahiduzzamanEmon/loadpulse.git
cd loadpulse
npm install
npm run dev:agent
```

### 2. Start the Dashboard

```bash
# From the cloned repo
npm run dev:web
```

Opens at **http://localhost:3040**

### 3. Connect & Test

1. Open http://localhost:3040
2. Enter your API server URL (e.g. `http://localhost:8000`)
3. Enter credentials (username/password for authenticated endpoints)
4. Agent URL is `http://localhost:3050` by default
5. Click **Connect & Discover** — endpoints auto-populate from OpenAPI schema
6. Go to **Endpoints** → select which ones to test
7. Go to **Run Tests** → pick test type, set concurrency, hit Run
8. Watch results stream in real-time

## Test Types

| Type | What it does |
|------|-------------|
| **Load** | Fire N concurrent requests to all selected endpoints. Measures throughput and error rate. |
| **Stress** | Auto-increase concurrency (50 → 100 → 200 → 500) until the server breaks. Finds the breaking point. |
| **Spike** | Sudden traffic burst: 10 → N → 10 → N → 10. Tests recovery from sudden load. |
| **Soak** | Sustained load over 10 rounds (~2 min). Detects memory leaks and gradual degradation. |
| **Functional** | Single request per endpoint. Validates status code, JSON response, reachability. |
| **Cache** | GET → mutate → GET. Verifies cache invalidation — no stale data after writes. |
| **Auth** | Tests no-auth (401), valid-auth (200), bad-token (401) per endpoint. |

## Features

- **Auto-discovery** — reads OpenAPI schema or probes DRF API root to find all endpoints
- **Real-time streaming** — results appear as they happen via WebSocket
- **Animated counters** — live success/error/response time counters with smooth animations
- **Per-endpoint table** — aggregated stats (total, OK, rate, avg, p95, min, max) per endpoint
- **Error breakdown** — grouped by status code (429 rate limited, 500 server error, etc.) with explanations
- **Response time chart** — live line chart of response times
- **Stress curve** — avg time, p95, and error rate plotted against concurrency
- **History** — past test runs saved, compare results
- **Dark/Light theme** — toggle in sidebar
- **Configurable** — concurrency presets (10-500) + custom input, timeout, page size — all from UI

## Project Structure

```
loadpulse/
├── agent/                  # Node.js test runner
│   ├── src/
│   │   ├── cli.ts          # CLI entry: npx loadpulse-agent
│   │   ├── index.ts        # WebSocket server (port 3050)
│   │   ├── discovery.ts    # Auto-discover endpoints from OpenAPI
│   │   ├── auth.ts         # Login & token management
│   │   └── runner/
│   │       ├── loadTest.ts
│   │       ├── stressTest.ts
│   │       ├── spikeTest.ts
│   │       ├── soakTest.ts
│   │       ├── functionalTest.ts
│   │       ├── cacheTest.ts
│   │       ├── authTest.ts
│   │       └── utils.ts    # Shared: buildUrls, fireBatch, calcLevel
│   ├── Dockerfile
│   └── package.json
│
├── web/                    # Next.js 16 dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Connect page
│   │   │   ├── endpoints/page.tsx  # Endpoint explorer
│   │   │   ├── run/page.tsx        # Test runner
│   │   │   └── history/page.tsx    # Past runs
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LiveCounter.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── run/
│   │   │       ├── TestConfigPanel.tsx
│   │   │       ├── EndpointResultsTable.tsx
│   │   │       ├── ErrorBreakdown.tsx
│   │   │       ├── ResponseChart.tsx
│   │   │       ├── ResultsList.tsx
│   │   │       └── TestSummaryCard.tsx
│   │   ├── store/
│   │   │   ├── Features/states/
│   │   │   │   ├── connectionSlice.ts
│   │   │   │   └── testRunSlice.ts
│   │   │   ├── ReduxProvider/
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   └── lib/
│   │       ├── ws.ts       # WebSocket client
│   │       ├── types.ts    # Shared TypeScript types
│   │       └── providers.tsx
│   └── package.json
│
└── package.json            # Monorepo root (npm workspaces)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Dashboard | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| State | Redux Toolkit |
| Agent | Node.js, TypeScript, ws |
| Communication | WebSocket (real-time streaming) |

## Configuration

All settings are configurable from the dashboard UI:

| Setting | Default | Description |
|---------|---------|-------------|
| Concurrency | 100 | Number of concurrent requests (presets: 10, 25, 50, 100, 200, 300, 500, or custom) |
| Timeout | 30s | Per-request timeout |
| Page Size | 10 | Pagination page_size parameter |
| Stress Levels | 50→500 | Auto-increasing concurrency steps |

## Agent CLI

```bash
npx loadpulse-agent [options]

Options:
  -p, --port <number>   Port to listen on (default: 3050)
  -h, --help            Show help
```

## Endpoint Discovery

LoadPulse auto-discovers your API endpoints using two strategies:

1. **OpenAPI Schema** — fetches `/api/schema/?format=json` (works with drf-spectacular, Swagger, etc.)
2. **API Root Probing** — falls back to DRF browsable API root, probes each endpoint for allowed HTTP methods

URL template paths (e.g. `/users/{id}/`) are automatically filtered out — only list endpoints are included.

## Development

```bash
git clone https://github.com/MdWahiduzzamanEmon/loadpulse.git
cd loadpulse
npm install

# Start both agent and dashboard
npm run dev

# Or separately
npm run dev:agent   # Agent on :3050
npm run dev:web     # Dashboard on :3040
```

## License

MIT
