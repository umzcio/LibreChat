# 01 - Codebase Inventory & Structural Map

**Scope:** `/projects/LibreEco/LibreChat/client` (React/TypeScript frontend for LibreChat)
**Date:** 2026-04-04

---

## 1. Directory Structure Overview

```
client/
  index.html                    # Vite HTML entry point
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.cjs
  postcss.config.cjs
  babel.config.cjs              # Jest/test transpilation
  jest.config.cjs
  nginx.conf                    # Production container config
  scripts/                      # Build scripts (post-build.cjs)
  public/
    assets/                     # Favicons, icons, manifest assets
    fonts/                      # Web fonts
  src/
    main.jsx                    # Application entry point
    App.jsx                     # Root React component (renders RouterProvider)
    style.css / mobile.css      # Global stylesheets (Tailwind)
    vite-env.d.ts               # Vite type declarations
    @types/                     # TypeScript augmentations (i18next, react)
    a11y/                       # Accessibility: LiveAnnouncer, LiveMessage
    common/                     # Shared types, selectors, constants (9 files)
    constants/                  # App-level constants (agentCategories.ts)
    components/                 # UI components (30 feature directories)
    data-provider/              # React Query hooks/mutations (13 feature modules)
    hooks/                      # Custom React hooks (20 feature directories)
    locales/                    # i18n translations (41 languages, JSON)
    Providers/                  # React Context providers (28 contexts)
    routes/                     # React Router definitions + route components
    store/                      # Recoil + Jotai state atoms/selectors (22 files)
    utils/                      # Pure utility functions (55 files)
  test/                         # Test utilities, layout helpers
```

### Component Directories (30 feature areas)

Agents, Artifacts, Audio, Auth, Banners, Bookmarks, Chat, Code, Conversations, Endpoints, Files, Input, MCP, MCPUIResource, Messages, Nav, OAuth, Plugins, Projects, Prompts, Share, SharePoint, Sharing, SidePanel, System, Tools, ui, UnifiedSidebar, Web

---

## 2. File Statistics

### File Count by Extension

| Extension | Count | Notes |
|-----------|-------|-------|
| `.tsx`    | 705   | React components & hooks with JSX |
| `.ts`     | 406   | Pure TypeScript (types, utils, hooks, store) |
| `.json`   | 41    | Locale translations (41 languages) |
| `.jsx`    | 2     | Legacy entry files (main.jsx, App.jsx) |
| `.js`     | 2     | Legacy utility (getThemeFromEnv.js) + 1 other |
| `.css`    | 2     | Global styles (style.css, mobile.css) |
| `.md`     | 1     | Internal doc |
| **Total** | **1,159** | All files under `src/` |

### Lines of Code

| Category | LOC |
|----------|-----|
| Source code (TS/TSX/JS/JSX/CSS, excl. locales) | ~143,600 |
| Locale JSON files (41 languages) | ~32,700 |
| **Estimated total (src/)** | **~176,300** |

### Test Files

- **31** `__tests__` directories
- **128** test files (`.spec.*` / `.test.*`)

---

## 3. Entry Points

### Application Entry
- **`index.html`** -- Vite HTML template, mounts `#root`
- **`src/main.jsx`** -- `createRoot()`, renders `<App />` inside `<ApiErrorBoundaryProvider>`
- **`src/App.jsx`** -- Renders `<RouterProvider>` with the router from `src/routes/index.tsx`

### Route Definitions (`src/routes/index.tsx`)

| Route Pattern | Component | Auth Required |
|--------------|-----------|---------------|
| `/` | Redirect to `/c/new` | Yes |
| `/c/:conversationId?` | ChatRoute | Yes |
| `/code/:conversationId?` | CodePage | Yes |
| `/p/:projectId` | ProjectView | Yes |
| `/p/:projectId/c/:conversationId?` | ChatRoute | Yes |
| `/p/:projectId/code/:conversationId?` | CodePage | Yes |
| `/search` | Search | Yes |
| `/agents`, `/agents/:category` | AgentMarketplace | Yes |
| `/login`, `/login/2fa` | Login, TwoFactorScreen | No |
| `/register` | Registration | No |
| `/forgot-password` | RequestPasswordReset | No |
| `/reset-password` | ResetPassword | No |
| `/verify` | VerifyEmail | No |
| `/share/:shareId` | ShareRoute | No |
| `/oauth/success`, `/oauth/error` | OAuthSuccess, OAuthError | No |
| `/d/*` (dashboard) | Dashboard routes | Yes |

### Config Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build, dev proxy, chunking, PWA, compression |
| `tsconfig.json` | TypeScript config (path aliases `~/*`, strict mode) |
| `tailwind.config.cjs` | Tailwind CSS configuration |
| `postcss.config.cjs` | PostCSS plugins |
| `babel.config.cjs` | Babel for Jest test transpilation |
| `jest.config.cjs` | Jest test runner configuration |
| `nginx.conf` | Production nginx config for Docker container |

---

## 4. Dependency Analysis

### Core Dependencies (critical path)

| Package | Version | Usage |
|---------|---------|-------|
| `react` / `react-dom` | ^18.2.0 | Framework |
| `react-router-dom` | ^6.30.3 | Client-side routing |
| `recoil` | ^0.7.7 | Primary state management (219 files) |
| `jotai` | ^2.12.5 | Secondary state management (18 files, newer features) |
| `@tanstack/react-query` | ^4.28.0 | Server state / data fetching |
| `librechat-data-provider` | `*` (workspace) | Shared types, API endpoints, data service (567 files) |
| `@librechat/client` | `*` (workspace) | Shared frontend utilities |
| `i18next` / `react-i18next` | ^24.2.2 / ^15.4.0 | Internationalization (41 languages) |
| `react-hook-form` | ^7.43.9 | Form handling |
| `react-markdown` | ^9.0.1 | Markdown rendering |
| `zod` | ^3.22.4 | Schema validation |

### UI Libraries

| Package | Version | Usage |
|---------|---------|-------|
| `@radix-ui/*` (14 packages) | Various | Primitive UI components |
| `@headlessui/react` | ^2.1.2 | Accessible UI primitives |
| `@ariakit/react` | ^0.4.15 | Additional accessible primitives |
| `lucide-react` | ^0.394.0 | Icon library |
| `framer-motion` | ^11.5.4 | Animation library |
| `@react-spring/web` | ^9.7.5 | Animation (1 file: Chat/Landing.tsx) |
| `tailwind-merge` / `clsx` | ^1.9.1 / ^2.1.1 | Class utilities |
| `class-variance-authority` | ^0.7.1 | Variant-based styling |

### Feature-Specific Dependencies

| Package | Purpose | Import Count |
|---------|---------|-------------|
| `mermaid` | Diagram rendering | Dedicated chunk |
| `@monaco-editor/react` | Code editor | Artifacts/Code features |
| `@codesandbox/sandpack-react` | Code sandbox previews | Artifacts |
| `react-virtualized` | Virtual scrolling | 6 files |
| `@dicebear/core` + `/collection` | Avatar generation | |
| `@mcp-ui/client` | MCP UI resource rendering | MCPUIResource |
| `sse.js` | Server-sent events | SSE data-provider |
| `react-speech-recognition` | Speech-to-text | Audio hooks |
| `dompurify` | HTML sanitization | |
| `@marsidev/react-turnstile` | CAPTCHA | Auth |
| `input-otp` | OTP input for 2FA | Auth |
| `qrcode.react` | QR code generation | 2FA, share |

### Potentially Low-Use Dependencies

These are installed but used in very few places. They are not necessarily "unused" but warrant review for bundle optimization:

| Package | Import Count | Location(s) |
|---------|-------------|-------------|
| `@react-spring/web` | 1 | `Chat/Landing.tsx` |
| `react-flip-toolkit` | 1 | `Chat/Menus/Presets/PresetItems.tsx` |
| `swr` | 1 | `hooks/Mermaid/useMermaid.ts` (alongside react-query) |
| `heic-to` | 1 | `utils/heicConverter.ts` |
| `rc-input-number` | 1 | `common/types.ts` (type import only) |
| `match-sorter` | 2 | Memory/Project panels |
| `react-transition-group` | 2 | AssistantConversationStarters, MessagesView |
| `ts-md5` | low | Hash generation |

### Pinning Issues

- **Workspace deps use `*`:** `librechat-data-provider` and `@librechat/client` are set to `*`, which is correct for monorepo workspace references.
- **All external deps use caret (`^`) ranges:** Standard practice, no exact pinning. This is fine for a monorepo with a lockfile, but means `npm install` without lockfile could pull breaking changes.
- **React Query v4:** Currently on `^4.28.0` while v5 is the latest. The devDependencies include `@tanstack/react-query-devtools` at `^4.29.0`, which is consistent.
- **Recoil `^0.7.7`:** This library is essentially unmaintained (last release 2023). The codebase is partially migrating to Jotai (18 files vs 219 for Recoil).

---

## 5. Architectural Pattern

### Classification: Monorepo Workspace Frontend SPA

The `client/` directory is one workspace within a larger LibreChat monorepo. It is a **single-page application** (SPA) built with:

- **Build:** Vite 7 + TypeScript + Tailwind CSS
- **Runtime:** React 18 + React Router v6
- **State:** Recoil (primary) + Jotai (incremental adoption) + React Query (server state)
- **Styling:** Tailwind CSS + Radix UI primitives + class-variance-authority
- **Deployment:** Docker (nginx) or Vite dev server proxying to Express backend

### Layer Boundaries

```
┌─────────────────────────────────────────────────────┐
│  Routes (src/routes/)                               │
│  Entry points, layout wrappers, auth guards         │
├─────────────────────────────────────────────────────┤
│  Components (src/components/)                       │
│  30 feature directories, ~705 TSX files             │
│  Organized by feature domain (Chat, Agents, etc.)   │
├─────────────────────────────────────────────────────┤
│  Hooks (src/hooks/)                                 │
│  20 feature directories, business logic layer       │
│  Bridges components to data-provider and store      │
├─────────────────────────────────────────────────────┤
│  Providers (src/Providers/)                         │
│  28 React Contexts for cross-cutting state          │
├─────────────────────────────────────────────────────┤
│  Data Provider (src/data-provider/)                 │
│  React Query hooks for API calls (queries/mutations)│
│  13 feature modules mirroring backend endpoints     │
├─────────────────────────────────────────────────────┤
│  Store (src/store/)                                 │
│  Recoil atoms/selectors + Jotai atoms               │
│  Client-side UI state (22 files)                    │
├─────────────────────────────────────────────────────┤
│  Common / Utils / Constants                         │
│  Shared types, pure functions, constants            │
├─────────────────────────────────────────────────────┤
│  Shared Packages (workspace dependencies)           │
│  librechat-data-provider: API types & data service  │
│  @librechat/client: shared frontend utilities       │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Notes

1. **Dual state management:** Recoil is the established system (219 files) but Jotai is being adopted for newer features (18 files). Store files like `mcp.ts`, `fontSize.ts`, `showThinking.ts` use Jotai.

2. **Context-heavy architecture:** 28 React Context providers supplement the atom-based state, used extensively for scoped component tree state (chat context, message context, panel context, etc.).

3. **Feature-aligned directories:** Components, hooks, data-provider, and store all share the same feature domain names (Agents, Chat, Files, MCP, etc.), making navigation predictable.

4. **The `librechat-data-provider` package** is the most imported dependency (567 files) -- it provides all API types, endpoint definitions, and the data service layer shared between frontend and backend.

---

## 6. Import Graph Summary

### Highest Fan-In (Most Imported Modules)

These modules are dependencies of the most other files:

| Module | Import Count | Role |
|--------|-------------|------|
| `librechat-data-provider` | 567 files | Shared types, API types, data service |
| `~/hooks` (barrel) | 441 files | Custom hooks barrel export |
| `~/utils` (barrel + subpaths) | 348 files | Utility functions |
| `~/common` | 271 files | Shared types and constants |
| `~/data-provider` (barrel) | 192 files | React Query hooks for API |
| `~/store` | 175 files | Recoil/Jotai state atoms |
| `~/Providers` (barrel + subpaths) | 155 files | React Context providers |
| `~/components/ui` | 7 files | Minimal shared UI (AdminSettingsDialog, TermsAndConditionsModal) |

### Highest Fan-Out (Most Imports Per File)

Files with the most `import` statements, indicating high coupling:

| File | Import Count | Role |
|------|-------------|------|
| `src/locales/i18n.ts` | 44 | Imports all 41 locale files |
| `src/components/Prompts/forms/PromptForm.tsx` | 27 | Complex form component |
| `src/components/SidePanel/Agents/AgentConfig.tsx` | 24 | Agent configuration panel |
| `src/components/Chat/Input/ChatForm.tsx` | 24 | Main chat input form |
| `src/components/SidePanel/Agents/AgentPanel.tsx` | 22 | Agent panel orchestrator |
| `src/components/SidePanel/Builder/AssistantPanel.tsx` | 22 | Assistant builder panel |
| `src/hooks/SSE/useEventHandlers.ts` | 21 | SSE event processing |
| `src/components/Chat/ChatView.tsx` | 20 | Main chat view |
| `src/components/Artifacts/Artifacts.tsx` | 20 | Artifacts container |
| `src/components/Chat/Messages/Content/Markdown.tsx` | 20 | Markdown renderer |

### Circular Dependency Observations

**No hard circular dependencies detected** at the directory layer level. The dependency flow is generally clean:

```
routes -> components -> hooks -> data-provider -> store
                    -> Providers
                    -> common/utils (leaf)
```

**Potential circular patterns (type-level only, non-breaking):**

1. **`common/types.ts` <-> `hooks/MCP/useMCPServerManager.ts`:** `common/types.ts` imports `MCPServerDefinition` (a value import) from `hooks/MCP/useMCPServerManager.ts`, while that hook imports `ConfigFieldDetail` type from `common`. This is the only notable cross-layer value import.

2. **`data-provider` -> `store`:** 7 data-provider files import from `~/store` (Recoil atoms). This couples the data-fetching layer to client-side state, breaking the typical layered architecture. Files: `Auth/mutations.ts`, `Auth/queries.ts`, `Endpoints/queries.ts`, `Files/queries.ts`, `Misc/queries.ts`, `prompts.ts`, `Favorites.ts`.

3. **`hooks` -> `components`:** 5 hook files import from `~/components`, which is an inversion of the typical dependency direction. These are for: `useSideNavLinks.ts`, `useCategories.tsx`, `useUnifiedSidebarLinks.ts`, `useMentions.ts`, `useSharePointPicker.ts`.

---

## 7. Summary Statistics

| Metric | Value |
|--------|-------|
| Total source files | 1,159 |
| Total LOC (incl. locales) | ~176,300 |
| LOC (excl. locales) | ~143,600 |
| Component directories | 30 |
| Hook directories | 20 |
| Data-provider modules | 13 |
| Context providers | 28 |
| Recoil store files | 22 |
| Supported languages | 41 |
| Test files | 128 |
| Production dependencies | 88 |
| Dev dependencies | 30 |
| Route definitions | ~18 |
