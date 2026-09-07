# Barbon Performance Analysis — frontend

Video analysis platform for Barbon Performance. A player records themselves on court and
uploads the video, the coach analyses it, and the player gets back an edited feedback video
with findings marked by timestamp.

This repository holds the two clients. The API lives in `barbon-performance-analysis-backend`.

The architecture, the data model and the phase plan live in `docs/ARCHITECTURE.md` in the
`barbon-performance-analysis-backend` repository. The product mockup in
[`docs/barbon-performance-analysis-mockup-v3.html`](docs/barbon-performance-analysis-mockup-v3.html)
is the specification for both UX and copy — open it alongside the app when building a screen.

## Layout

| Path                   | What it is                                     |
| ---------------------- | ---------------------------------------------- |
| `apps/mobile/`         | React Native + Expo, the player app             |
| `apps/coach/`          | Electron + React + Vite, the coach desktop app  |
| `packages/core/`       | Design tokens, shared enums, timestamp formatting |
| `packages/api-client/` | Generated API types and the fetch wrapper       |
| `docs/`                | The product mockup                              |

## Running it

Prerequisites: Node 22+, pnpm 11+, and the backend running on http://localhost:8080.

```bash
pnpm install
pnpm mobile   # Expo dev server
pnpm coach    # Electron dev window
```

### The video loop end to end (phone + desktop)

There is no Cloudflare Stream in development — the backend runs a local video provider
(`tusd` + MinIO). To try the whole loop with Expo Go on a real phone, run the backend with
`ANALYSIS_VIDEO_PROVIDER=local` and its `*_PUBLIC_*` URLs set to the machine's LAN address
(see "Running the video loop locally" in the backend README). The mobile app already
discovers that LAN address from the Metro bundler host, and the desktop app reaches the same
URLs — neither client needs extra configuration. Locally uploaded videos are progressive MP4
(no HLS); `HlsVideo` in the coach app plays them natively.

## The API contract

The backend's OpenAPI spec is the source of truth for both clients. After a DTO changes there:

```bash
pnpm gen:api    # backend must be running; override the source with OPENAPI_URL
```

This rewrites `packages/api-client/src/generated/schema.d.ts`. If a client stops compiling
afterwards, the contract changed and the client has to catch up — which is the point.

## Tests

```bash
pnpm typecheck
```
