# LibreChat Codebase Inventory

**Date:** 2026-04-04
**Version:** v0.8.4
**Branch:** feat/projects

---

## 1. Directory Structure (Depth 3)

```
.
├── api/                         # Legacy JS backend (Express server)
│   ├── app/
│   │   └── clients/             # AI provider clients (OpenAI, Anthropic, etc.)
│   ├── cache/
│   ├── config/
│   ├── db/
│   ├── models/
│   ├── server/
│   │   ├── controllers/         # Route controllers (agents, assistants, etc.)
│   │   ├── middleware/           # Auth, rate limiting, validation, RBAC
│   │   ├── routes/              # Express route definitions (~35 route modules)
│   │   ├── services/            # Business logic (Config, Files, Endpoints, MCP, etc.)
│   │   └── utils/
│   ├── strategies/              # Passport auth strategies (JWT, LDAP, SAML, OAuth, etc.)
│   ├── test/
│   └── utils/
├── client/                      # React SPA frontend
│   ├── public/
│   │   ├── assets/
│   │   └── fonts/
│   ├── src/
│   │   ├── a11y/                # Accessibility (ARIA live announcer)
│   │   ├── common/              # Shared types and constants
│   │   ├── components/          # UI components (Chat, Agents, Nav, SidePanel, etc.)
│   │   ├── constants/
│   │   ├── data-provider/       # React Query hooks (per-feature: Agents, Files, SSE, etc.)
│   │   ├── hooks/               # Custom hooks (per-feature directories)
│   │   ├── locales/             # i18n translation files
│   │   ├── Providers/           # React context providers
│   │   ├── routes/              # Client-side routing
│   │   ├── store/               # Jotai state atoms
│   │   ├── @types/
│   │   └── utils/
│   └── test/
├── config/                      # CLI scripts (create-user, add-balance, migrations, etc.)
│   ├── __tests__/
│   └── translations/
├── e2e/                         # Playwright end-to-end tests
│   ├── setup/
│   └── specs/
├── helm/                        # Kubernetes Helm charts
│   ├── librechat/
│   └── librechat-rag-api/
├── packages/
│   ├── api/                     # New TS backend code (@librechat/api)
│   │   └── src/                 # MCP, cache, stream, middleware, agents, admin, etc.
│   ├── client/                  # Shared frontend utilities (@librechat/client)
│   │   └── src/                 # Theme, components (DataTable), hooks, SVGs
│   ├── data-provider/           # Shared API types/endpoints (librechat-data-provider)
│   │   ├── react-query/
│   │   └── src/                 # Types, schemas, config, data-service, endpoints
│   └── data-schemas/            # Mongoose schemas/models (@librechat/data-schemas)
│       └── src/                 # Models, methods, schema, migrations, admin, utils
├── utils/
│   └── docker/
├── zr-mcp-author/               # Custom MCP server (creative writing)
├── zr-mcp-creative/             # Custom MCP server (creative writing)
└── zr-mcp-grants/               # Custom MCP server (grant writing)
```

---

## 2. File Count by Extension (Top 15)

| Extension | Count |
|-----------|-------|
| .ts       | 1,168 |
| .tsx      | 846   |
| .js       | 469   |
| .json     | 112   |
| .py       | 67    |
| .md       | 58    |
| .yml      | 37    |
| .png      | 32    |
| .svg      | 25    |
| .yaml     | 24    |
| .log      | 14    |
| .woff2    | 9     |
| .sh       | 9     |
| .cjs      | 7     |
| .css      | 6     |

**Total source files (TS/TSX/JS/JSX):** ~2,488

---

## 3. Estimated Total LOC

**~564,000 lines** across all source, config, and markup files (TS, TSX, JS, JSX, JSON, CSS, YAML, YML).

### LOC by Workspace (approximate)

| Workspace | Role | Files | Est. LOC |
|-----------|------|-------|----------|
| `api/` | Legacy JS backend | ~350 | ~80,000 |
| `client/` | React frontend | ~850 | ~150,000 |
| `packages/api/` | New TS backend | ~350 | ~80,000 |
| `packages/client/` | Shared frontend | ~60 | ~10,000 |
| `packages/data-provider/` | Shared types/API | ~50 | ~25,000 |
| `packages/data-schemas/` | DB schemas/models | ~150 | ~30,000 |
| `config/` + `e2e/` + misc | Tooling/tests | ~100+ | ~20,000 |
| Translation JSON (`locales/`) | i18n strings | ~50 | ~150,000+ |

Note: The locales directory contains large auto-generated translation JSON files inflating total LOC.

---

## 4. Entry Points

### Server Entry Points
- **`api/server/index.js`** -- Primary Express server entry point (started via `npm run backend`)
- **`api/server/experimental.js`** -- Experimental server variant

### Frontend Entry Points
- **`client/src/App.jsx`** -- React application root
- **`client/src/routes/index.tsx`** -- React Router configuration (createBrowserRouter)

### Route Definitions (API)
- **`api/server/routes/index.js`** -- Central route registry (~35 route modules)
- Individual route files: `auth`, `user`, `convos`, `messages`, `agents`, `assistants`, `files`, `mcp`, `prompts`, `config`, `models`, `search`, `share`, `projects`, `code`, `apiKeys`, `memories`, `roles`, `oauth`, `balance`, `banner`, `categories`, `tags`, `keys`, `presets`, `endpoints`, `actions`, `accessPermissions`
- Admin routes: `admin/auth`, `admin/config`, `admin/grants`, `admin/groups`, `admin/roles`, `admin/users`

### CLI Entry Points
- **`config/`** directory contains ~20 CLI scripts: `create-user.js`, `add-balance.js`, `ban-user.js`, `delete-user.js`, `invite-user.js`, `list-users.js`, `reset-password.js`, `update-banner.js`, `flush-cache.js`, `migrate-agent-permissions.js`, etc.

### Package Entry Points
- `packages/api/src/index.ts` -> `dist/index.js` (CommonJS)
- `packages/client/src/index.ts` -> `dist/index.js` + `dist/index.es.js`
- `packages/data-provider/src/index.ts` -> `dist/index.js` + `dist/index.es.js`
- `packages/data-provider/src/react-query/index.ts` -> separate react-query bundle
- `packages/data-schemas/src/index.ts` -> `dist/index.cjs` + `dist/index.es.js`
- `packages/data-schemas` also exports `./capabilities` sub-path

---

## 5. Config Files

### Build/Compile
| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo pipeline config (parallel builds, caching) |
| `client/vite.config.ts` | Vite build for frontend |
| `client/tsconfig.json` | Frontend TS config |
| `client/tailwind.config.cjs` | Tailwind CSS |
| `packages/api/tsconfig.json` | TS backend build |
| `packages/api/tsconfig.build.json` | TS build variant |
| `packages/data-provider/tsconfig.json` | Data provider TS |
| `packages/data-schemas/tsconfig.json` | Data schemas TS |
| `packages/client/tsconfig.json` | Client package TS |

### Test
| File | Purpose |
|------|---------|
| `api/jest.config.js` | Backend tests |
| `client/jest.config.cjs` | Frontend tests |
| `packages/api/jest.config.mjs` | TS backend tests |
| `packages/data-provider/jest.config.js` | Data provider tests |
| `packages/data-schemas/jest.config.mjs` | Data schemas tests |
| `packages/client/jest.config.js` | Client package tests |

### Docker
| File | Purpose |
|------|---------|
| `Dockerfile` | Main application image |
| `Dockerfile.multi` | Multi-stage build variant |
| `docker-compose.yml` | Primary compose (api, mongodb, meilisearch, vectordb, rag_api) |
| `docker-compose.override.yml` | Local overrides |
| `.devcontainer/docker-compose.yml` | Dev container config |

### Lint/Format
| File | Purpose |
|------|---------|
| `.prettierrc` | Prettier config |
| Root eslint config | ESLint 9 flat config |

### Environment
- `.env` -- Active environment config
- `.env.example` -- Template

---

## 6. Dependency Analysis

### Root (`package.json`)
- **Zero production dependencies** -- all workspaces handle their own
- **DevDependencies (16):** ESLint ecosystem (9 packages), Prettier (2), Jest, Husky, Turbo, cross-env, Playwright, caniuse-lite
- Notable: `elliptic` is listed as a devDep, likely a security override only

### `api/` (Legacy Backend) -- 82 production deps, 4 devDeps
**Core framework:** Express v5.2.1 (early adoption of Express 5)
**Key dependencies:**
- AI providers: `@anthropic-ai/vertex-sdk`, `@aws-sdk/client-bedrock-runtime`, `@google/genai`, `openai 5.8.2`, `ollama`, `@langchain/core`, `@librechat/agents ^3.1.63`
- Database: `mongoose ^8.12.1`, `meilisearch ^0.38.0`
- Auth: `passport` + 8 strategy packages (Google, GitHub, Discord, Facebook, Apple, LDAP, SAML, JWT)
- MCP: `@modelcontextprotocol/sdk ^1.27.1`
- Caching: `keyv`, `@keyv/redis`, `ioredis`, `connect-redis`
- Cloud storage: `@aws-sdk/client-s3`, `@azure/storage-blob`, `firebase`
- File processing: `sharp`, `mammoth`, `pdfjs-dist`, `xlsx`, `yauzl`
- Observability: `winston` + `winston-daily-rotate-file`

### `client/` (Frontend) -- 86 production deps, 30 devDeps
**Core framework:** React 18, Vite 7, TypeScript, Tailwind CSS 3
**Key dependencies:**
- State: `jotai ^2.12.5` (atoms), `@tanstack/react-query ^4.28.0`
- UI components: 16 Radix UI packages, `@headlessui/react`, `@ariakit/react`, `lucide-react`
- Routing: `react-router-dom ^6.30.3`
- Rich content: `react-markdown`, `rehype-katex`, `remark-gfm`, `mermaid`, `@codesandbox/sandpack-react`, `@monaco-editor/react`
- Animation: `framer-motion`, `@react-spring/web`
- i18n: `i18next` + `react-i18next`
- Drag & drop: `react-dnd` + HTML5 backend

### `packages/api/` (@librechat/api) -- 0 direct deps, 36 peer deps, 30 devDeps
- Uses peer dependencies to share with `api/` -- proper for a consumed package
- Build: Rollup, TypeScript

### `packages/data-provider/` (librechat-data-provider) -- 4 deps, 14 devDeps
- Direct: `axios 1.13.6`, `dayjs`, `js-yaml`, `zod`
- Peer: `@tanstack/react-query ^4.28.0`
- Build: Rollup, TypeScript

### `packages/data-schemas/` (@librechat/data-schemas) -- 0 direct deps, 9 peer deps
- Peer: `mongoose`, `lodash`, `nanoid`, `jsonwebtoken`, `klona`, `meilisearch`, `winston`, `librechat-data-provider`
- Build: Rollup, TypeScript

### `packages/client/` (@librechat/client) -- 0 direct deps, 36 peer deps
- Peer: React 18+/19+, Radix UI, Jotai, React Query, etc.
- Build: Rollup, TypeScript

### Pinning Observations

| Issue | Details |
|-------|---------|
| **Exact pins** | `axios: 1.13.6`, `openai: 5.8.2` -- intentional, likely for stability |
| **URL dependency** | `xlsx` pinned to CDN tarball (`cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) |
| **Overrides** | Root has extensive `overrides` block (16 entries) for `@anthropic-ai/sdk`, `fast-xml-parser`, `katex`, `langsmith`, `hono`, `dompurify`, `serialize-javascript`, etc. |
| **React Query v4** | `@tanstack/react-query ^4.28.0` -- React Query v5 has been stable since late 2023; this is a migration candidate |
| **React 18** | Still on React 18; React 19 support noted in `@librechat/client` peer deps |
| **Express 5** | Early adoption of `express ^5.2.1` (still relatively new) |

### Potentially Unused or Redundant Dependencies
- `node-fetch ^2.7.0` in `api/` -- Express 5 runs on Node 18+ which has native `fetch`; also has `undici ^7.24.1`
- `module-alias ^2.2.3` in `api/` -- used for `~/` path aliasing in legacy JS; TS packages use `paths`
- `ai-tokenizer ^1.0.6` -- small utility; may overlap with tokenizer logic in `@librechat/agents`
- `regenerator-runtime` in `client/` -- typically not needed with modern Babel/Vite targets
- `swr ^2.3.8` in `client/` alongside `@tanstack/react-query` -- potential redundancy (two data-fetching libraries)

---

## 7. Architectural Pattern

### Type: Monorepo Full-Stack Application

LibreChat is a **Turborepo-managed npm workspaces monorepo** containing a full-stack application with shared packages.

### Framework Classification

| Layer | Core Frameworks | Role |
|-------|----------------|------|
| **Backend runtime** | Express 5, Node.js 20+ | HTTP server, API |
| **AI orchestration** | `@librechat/agents` (LangChain-based), OpenAI SDK, Google GenAI, Anthropic SDK | Multi-provider AI chat |
| **Database** | Mongoose/MongoDB, MeiliSearch (full-text search) | Persistence, search |
| **Caching** | Redis (ioredis), Keyv | Session, rate limiting, general cache |
| **Frontend framework** | React 18, Vite | SPA |
| **State management** | Jotai (atoms), React Query (server state) | Client state |
| **UI primitives** | Radix UI, Tailwind CSS, Headless UI | Design system |
| **Build system** | Turborepo, Rollup (packages), Vite (client) | Build orchestration |
| **Testing** | Jest (unit/integration), Playwright (e2e) | Quality |
| **Protocol** | MCP (Model Context Protocol) | Tool/context integration |

### Architectural Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  client/ ──uses──> packages/client/ ──uses──> packages/      │
│  (React SPA)        (shared UI)        data-provider/        │
│                                        (types, API service)  │
├─────────────────────────────────────────────────────────────┤
│                     HTTP / SSE BOUNDARY                      │
├─────────────────────────────────────────────────────────────┤
│                        BACKEND                               │
│  api/ ──calls──> packages/api/ ──uses──> packages/           │
│  (legacy JS        (new TS code)      data-schemas/          │
│   Express routes)                     (Mongoose models)      │
│                                                              │
│  Both api/ and packages/api/ consume packages/data-provider/ │
│  for shared types, constants, and config                     │
└─────────────────────────────────────────────────────────────┘
```

**Key boundaries:**
1. **API Layer:** `api/server/routes/` -> `api/server/controllers/` -> `api/server/services/` + `packages/api/src/`
2. **Data Layer:** `packages/data-schemas/` (Mongoose models), `api/models/` (legacy model index)
3. **UI Layer:** `client/src/components/`, `packages/client/src/`
4. **Shared Utilities:** `packages/data-provider/` (cross-cutting types, endpoints, data-service)
5. **AI Provider Layer:** `api/app/clients/` (legacy), `packages/api/src/agents/` + `packages/api/src/endpoints/` (new)
6. **MCP Layer:** `packages/api/src/mcp/` (server management, OAuth, registry)

### Migration Pattern
The codebase is actively migrating from `api/` (legacy JS) to `packages/api/` (new TS). The legacy `api/` serves as thin wrappers calling into `packages/api/`. New backend code must be TypeScript in `packages/api/`.

---

## 8. Import Graph Summary

### High Fan-In Modules (Most Imported)

These modules are imported by the largest number of other files:

| Module | Import Count | Location |
|--------|-------------|----------|
| `~/hooks` (barrel) | ~373 imports | `client/src/hooks/` -- most imported client module |
| `~/components` (barrel) | ~308 imports | `client/src/components/` |
| `librechat-data-provider` | ~280 imports | `packages/data-provider/` -- shared across all workspaces |
| `react` | ~846 files | Core framework |
| `jotai` | ~271 imports | State management atoms |
| `~/store` | ~201 imports | `client/src/store/` -- Jotai atoms |
| `~/Providers` | ~210 imports | `client/src/Providers/` -- React contexts |
| `~/data-provider` | ~192 imports | `client/src/data-provider/` -- React Query hooks |
| `~/utils` | ~160 imports | `client/src/utils/` |
| `~/common` | ~245 imports | `client/src/common/` -- shared types |
| `mongoose` | ~194 imports | `packages/data-schemas/` + `api/` |
| `~/models` (backend) | ~189 imports | `api/models/` via `require('~/models')` |
| `express` | ~54 imports | Backend route/middleware definitions |
| `@librechat/api` | ~280+ imports | `packages/api/` consumed by `api/` |
| `@librechat/data-schemas` | ~280+ imports | DB layer consumed across backend |
| `zod` | ~33 imports | Schema validation |

### High Fan-Out Modules (Import the Most)

| Module | Description |
|--------|-------------|
| `api/server/index.js` | Imports 20+ modules (routes, middleware, DB, config, strategies) |
| `client/src/routes/index.tsx` | Imports all page components and layouts |
| `client/src/App.jsx` | Imports React Query, DnD, router, theme, providers |
| `api/server/routes/index.js` | Re-exports 35 route modules |
| `packages/data-provider/src/index.ts` | Barrel file exporting all types, schemas, config |
| `packages/data-schemas/src/index.ts` | Barrel for all models and methods |
| `client/src/hooks/index.ts` | Barrel for all hook directories |
| `client/src/components/Chat/Messages/Content/MarkdownComponents.tsx` | Heavy renderer importing many sub-components |
| `client/src/hooks/SSE/useEventHandlers.ts` | Coordinates multiple SSE event handlers |

### Circular Dependency Risk Areas

1. **`packages/data-provider/src/types/assistants.ts`** -- Contains an explicit comment referencing circular dependency handling
2. **`api/` <-> `packages/api/`** -- The legacy JS backend imports from `@librechat/api` while `packages/api/` has peer deps on modules also used by `api/`. No direct circular, but tight coupling.
3. **`packages/data-schemas/` <-> `packages/data-provider/`** -- `data-schemas` has `librechat-data-provider` as a peer dep, and `data-provider` types reference schema types. The Turbo build order handles this (`data-provider` builds first, then `data-schemas`).
4. **Client barrel files** -- Deep barrel re-exports (`hooks/index.ts` -> `hooks/Chat/index.ts` -> individual hooks) create large dependency trees but are unlikely true circulars.

### Workspace Dependency Graph

```
packages/data-provider  (foundation -- no internal deps)
       ↑
packages/data-schemas   (depends on data-provider)
       ↑
packages/api            (depends on data-schemas + data-provider)
       ↑
api/                    (depends on packages/api + data-schemas + data-provider)

packages/data-provider  (foundation)
       ↑
packages/client         (depends on data-provider)
       ↑
client/                 (depends on packages/client + data-provider)
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total source files | ~2,488 |
| Total LOC (all file types) | ~564,000 |
| Workspaces | 6 (api, client, packages/api, packages/client, packages/data-provider, packages/data-schemas) |
| API route modules | ~35 |
| Production dependencies (api) | 82 |
| Production dependencies (client) | 86 |
| Shared package deps (data-provider) | 4 |
| Auth strategies | 8+ (JWT, LDAP, SAML, Google, GitHub, Discord, Facebook, Apple) |
| AI providers supported | 6+ (OpenAI, Anthropic, Google, AWS Bedrock, Azure, Ollama) |
| Docker services | 5 (api, mongodb, meilisearch, vectordb, rag_api) |
| Localization languages | ~50 translation files |
| Custom MCP servers | 3 (zr-mcp-author, zr-mcp-creative, zr-mcp-grants) |
