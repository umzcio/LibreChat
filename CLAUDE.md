# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Common Commands

### Development
- `npm run backend:dev` - Start backend in development mode (with nodemon auto-reload)
- `npm run frontend:dev` - Start frontend dev server with HMR
- `npm run backend` - Start backend in production mode
- `npm run frontend` - Build frontend for production

### Building
- `npm run build:packages` - Build all shared packages (data-provider, data-schemas, api, client-package)
- `npm run build:client` - Build frontend only
- `npm run build:data-provider` - Build data-provider package
- `npm run build:api` - Build API package
- `npm run build:data-schemas` - Build data-schemas package

### Testing
- `npm run test:client` - Run client tests
- `npm run test:api` - Run API tests
- `npm run e2e` - Run Playwright E2E tests (local config)
- `npm run e2e:headed` - Run E2E tests with browser visible
- `npm run e2e:debug` - Run E2E tests in debug mode
- `npm run e2e:ci` - Run E2E tests in CI mode

### Code Quality
- `npm run lint` - Run ESLint on all files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### User & Database Management
- `npm run create-user` - Create a new user
- `npm run invite-user` - Send user invitation
- `npm run list-users` - List all users
- `npm run reset-password` - Reset user password
- `npm run ban-user` - Ban a user
- `npm run delete-user` - Delete a user
- `npm run add-balance` - Add token balance to user
- `npm run set-balance` - Set user token balance
- `npm run list-balances` - List all user balances
- `npm run user-stats` - Show user statistics

### Updates & Migrations
- `npm run update` - Update dependencies
- `npm run update:local` - Update for local development
- `npm run update:docker` - Update for Docker setup
- `npm run reinstall` - Reinstall all dependencies
- `npm run migrate:agent-permissions` - Migrate agent permissions
- `npm run migrate:prompt-permissions` - Migrate prompt permissions

### Docker Deployment
- `npm run start:deployed` - Start deployed Docker compose stack
- `npm run stop:deployed` - Stop deployed Docker compose stack
- `npm run update:deployed` - Update deployed instance

### Other Utilities
- `npm run reset-meili-sync` - Reset Meilisearch sync
- `npm run update-banner` - Update site banner
- `npm run delete-banner` - Delete site banner
- `npm run reset-terms` - Reset terms of service
- `npm run flush-cache` - Clear application cache

---

# LibreChat Architecture Overview

This document provides a comprehensive architectural overview of the LibreChat codebase to help AI assistants quickly understand the system design and make informed decisions during development.

## 1. Project Structure (Monorepo)

LibreChat is a **Node.js/npm monorepo** using npm workspaces with the following structure:

```
LibreChat/
├── api/                      # Backend API server (Express.js)
├── client/                   # Frontend SPA (React + Vite)
├── packages/
│   ├── data-provider/        # HTTP client library & data access layer
│   ├── data-schemas/         # Shared TypeScript types & Mongoose schemas
│   ├── api/                  # API utilities, MCP services, endpoints logic
│   └── client/               # Shared React components library
├── config/                   # Database/admin scripts and utilities
├── e2e/                      # Playwright end-to-end tests
├── librechat.yaml            # Main configuration file (AI endpoints, interface, auth)
└── .env.example              # Environment variables template
```

### Key Configuration Files:
- **librechat.yaml**: YAML-based configuration for AI endpoints, interface settings, authentication, and features
- **.env**: Environment variables for MongoDB, API keys, auth providers, and server settings
- **docker-compose.yml**: Container orchestration for development
- **Dockerfile**: Production image build

## 2. Backend Architecture (Express.js + MongoDB)

### 2.1 Server Entry Point
**File**: `/api/server/index.js`

The Express server initializes:
1. **Middleware Stack**: CORS, compression, cookie parsing, sanitization, rate limiting
2. **Authentication**: Passport.js with JWT, local, LDAP, and OAuth strategies
3. **Session Management**: Express-session with Redis/memory storage
4. **Database**: Mongoose connection to MongoDB
5. **Static Assets**: Serves compiled frontend from `/dist`
6. **API Routes**: Mounts all route handlers at `/api/*` and `/oauth/*`

### 2.2 API Route Structure
**Location**: `/api/server/routes/`

Main endpoints include:
- `/api/auth` - Authentication (login, register, logout, OAuth callback)
- `/api/user` - User profile and settings
- `/api/convos` - Conversation CRUD operations
- `/api/messages` - Message creation and retrieval
- `/api/presets` - Conversation preset templates
- `/api/prompts` - Prompt management and sharing
- `/api/assistants` - OpenAI Assistants integration
- `/api/agents` - LLM Agents framework
- `/api/files` - File upload/download and storage
- `/api/endpoints` - Available AI endpoint configurations
- `/api/balance` - Token balance and accounting
- `/api/search` - Full-text search via Meilisearch
- `/api/config` - Application configuration retrieval
- `/api/models` - Available models per endpoint
- `/api/mcp` - Model Context Protocol servers
- `/api/roles` - Role-based access control
- `/api/permissions` - Fine-grained access permissions

### 2.3 Database Models (Mongoose)
**Location**: `/api/models/` and `/packages/data-schemas/src/schema/`

Core entities:
- **User**: Authentication, settings, preferences
- **Conversation**: Chat session with metadata
- **Message**: Individual messages with content, metadata, citations
- **File**: Uploaded documents and images
- **Assistant**: OpenAI Assistant configurations
- **Agent**: Custom LLM agents with tools
- **Preset**: Conversation templates
- **Prompt**: Reusable prompt library
- **Role**: RBAC roles (admin, user, etc.)
- **Transaction**: Token spend tracking
- **Balance**: User token balances
- **PromptGroup**: Organized prompt collections
- **Action**: Integration actions
- **Tool**: AI tool definitions

Each model includes:
- Mongoose schema definitions
- Business logic methods (create, update, delete, search)
- Validation and defaults
- Indexing for performance

### 2.4 Services Layer
**Location**: `/api/server/services/`

Key services:
- **AuthService**: User authentication, JWT/session management
- **AssistantService**: OpenAI Assistants API integration
- **ActionService**: External API actions framework
- **ToolService**: AI tool management and execution
- **ModelService**: Model availability and configuration
- **PermissionService**: Fine-grained access control logic
- **MCP**: Model Context Protocol server management
- **Config Services**: Configuration loading and caching
  - `loadCustomConfig`: Parses librechat.yaml with schema validation
  - `getEndpointsConfig`: Builds endpoint configuration from custom config
  - `loadConfigModels`: Merges default and configured models
  - `loadAsyncEndpoints`: Handles async model fetching from APIs

### 2.5 Middleware & Authentication
**Location**: `/api/server/middleware/`

Authentication strategies (Passport.js):
- **JWT**: Token-based authentication
- **Local**: Username/password with bcryptjs hashing
- **OAuth2**: Google, GitHub, Discord, Apple, Facebook via Passport
- **OpenID**: Generic OpenID Connect provider support
- **SAML**: Enterprise SAML 2.0 authentication
- **LDAP**: Corporate directory integration

Middleware:
- `abortMiddleware.js`: Handles request cancellation
- `checkBan.js`: User ban enforcement
- `checkPeoplePickerAccess.js`: Fine-grained ACL checks
- `accessResources/*`: Resource-level access control

### 2.6 AI Endpoint Architecture
**Location**: `/packages/api/src/endpoints/` and `/api/server/services/Endpoints/`

Supported AI providers:
- **OpenAI**: GPT models, Assistants, embeddings
- **Anthropic**: Claude models
- **Google**: Gemini, Vertex AI, Google Search integration
- **Azure OpenAI**: Managed OpenAI service
- **Custom Endpoints**: Any OpenAI-compatible API (Groq, Mistral, etc.)

Each endpoint implements:
- Model listing (hardcoded or fetched from API)
- Request/response formatting
- Streaming support
- Error handling and retries
- Token counting
- Vision capabilities
- Tool/function calling

Custom endpoints are defined in `librechat.yaml` with:
- API key and base URL
- Model lists (default or fetched)
- Parameter overrides (dropParams, addParams)
- Title and summary model configuration
- Custom display labels

## 3. Frontend Architecture (React + Vite)

### 3.1 Entry Point & Setup
**Files**: 
- `/client/src/main.jsx` - React root
- `/client/src/App.jsx` - Top-level component setup
- `/client/src/routes/` - React Router configuration

### 3.2 State Management

**Multi-layered approach**:

1. **Recoil** (`/client/src/store/`)
   - Atom & atomFamily: Individual state atoms for granular updates
   - Selectors: Derived state
   - Used for conversation state, messages, UI flags
   - Files: `families.ts`, `conversation.ts`, `agents.ts`, `endpoints.ts`, etc.

2. **React Query** (`@tanstack/react-query`)
   - Server state management
   - Caching, synchronization, background refetching
   - Integrated in data-provider layer

3. **Context API** (`/client/src/Providers/`)
   - Global UI state (modals, panels, themes)
   - Various contexts for feature-specific state
   - Examples: ChatContext, MessageContext, ArtifactsContext, AgentPanelContext

4. **localStorage**
   - User preferences (theme, language, font size)
   - Recent selections (assistant IDs, tools, models)
   - LocalStorageKeys: Enum of keys like `ASST_ID_PREFIX`, `AGENT_ID_PREFIX`

### 3.3 Component Organization
**Location**: `/client/src/components/`

Organized by feature:
- **Chat**: Main chat interface components
- **Conversations**: Conversation list and management
- **Messages**: Message rendering, citations, artifacts
- **Sidebar**: Navigation panel
- **Settings**: User preferences and account management
- **Auth**: Login/signup pages
- **Common**: Shared UI components (buttons, modals, inputs)

### 3.4 Data Provider Library
**Location**: `/packages/data-provider/src/`

Acts as HTTP client layer:
- **api-endpoints.ts**: URL builders for all API routes
- **data-service.ts**: High-level functions (login, createConversation, etc.)
- **request.ts**: Axios wrapper with auth, error handling, interceptors
- **config.ts**: Client configuration from server
- **generate.ts**: Streaming message generation

Types defined in `/packages/data-provider/src/types/`:
- Query/mutation types
- Response schemas
- Entity types (TUser, TConversation, TMessage, etc.)

### 3.5 Hooks
**Location**: `/client/src/hooks/`

Common patterns:
- `useAuthContext`: Access authenticated user state
- `useConversation`: Get/set current conversation
- `useMessages`: Message state and operations
- `useApi`: Data fetching with React Query
- `useSetConvoContext`: Derived context setter
- Custom hooks for feature-specific logic

### 3.6 Routing
**Location**: `/client/src/routes/`

React Router v6 setup:
- `/` - Home/chat interface
- `/login` - Authentication
- `/register` - User signup
- `/settings` - Settings page
- `/c/:conversationId` - Chat page with conversation
- `/share/:shareId` - Shared conversation view
- Dynamic routes for assistants, agents, etc.

### 3.7 Styling & Themes
- **Tailwind CSS**: Utility-first styling
- **Custom CSS**: Global styles in `style.css`
- **Theme Provider**: Dark/light mode + custom theme colors from environment
- **Radix UI**: Headless component library

## 4. Key Integration Points

### Frontend → Backend Data Flow

1. **User initiates action** (e.g., send message)
   ↓
2. **React component** calls data-provider function
   ↓
3. **data-provider** constructs request (URL, headers, body)
   ↓
4. **request.ts** (Axios) sends HTTP request with auth
   ↓
5. **Backend route** receives and validates request
   ↓
6. **Middleware** checks permissions, user status
   ↓
7. **Controller/Service** handles business logic
   ↓
8. **Database** performs CRUD
   ↓
9. **Response** sent back with data or error
   ↓
10. **React Query** caches response
    ↓
11. **Component** re-renders with new state

### Streaming Messages

Special case for real-time chat:
1. Frontend POSTs to `/api/messages` with conversation & message content
2. Backend streams response (Server-Sent Events or chunked transfer)
3. `generate.ts` in data-provider handles stream parsing
4. Messages are parsed incrementally and stored in Recoil
5. UI updates in real-time as tokens arrive

### WebSocket Alternative (MCPs)

For Model Context Protocol servers:
1. Frontend connects to `/api/mcp` endpoint
2. Server proxies connections to configured MCP servers
3. Tools and resources exposed through unified interface

## 5. Configuration System

### 5.1 librechat.yaml Structure

**Version**: Semantic versioning for config compatibility

**Top-level sections**:
- **cache**: Boolean to enable caching
- **interface**: UI configuration (menu items, settings, privacy policy, etc.)
- **registration**: Social login providers, allowed signup domains
- **balance**: Token balance system settings
- **transactions**: Enable/disable transaction logging
- **actions**: External API integrations
- **mcpServers**: Model Context Protocol server configs
- **endpoints**: AI provider configurations

**Endpoints configuration** (`endpoints.custom[]`):
```yaml
endpoints:
  custom:
    - name: 'endpoint-name'
      apiKey: '${ENV_VAR_NAME}'
      baseURL: 'https://api.example.com/v1'
      models:
        default: ['model-1', 'model-2']
        fetch: false  # or true to fetch from API
      titleConvo: true
      titleModel: 'model-name'
      dropParams: ['param1', 'param2']
      addParams: {key: value}
```

### 5.2 Environment Variables

**Processed by**: `/api/server/index.js`, `loadCustomConfig.js`, etc.

Categories:
- **Server**: HOST, PORT, NODE_ENV
- **Database**: MONGO_URI, MONGO_MAX_POOL_SIZE, etc.
- **Auth**: Social login credentials, JWT secrets
- **Endpoints**: API keys for various AI providers
- **Storage**: S3, Firebase, local file paths
- **Features**: Feature flags (ALLOW_SOCIAL_LOGIN, etc.)
- **Logging**: DEBUG_LOGGING, DEBUG_CONSOLE, CONSOLE_JSON

### 5.3 Configuration Loading Flow

1. `.env` is loaded by `dotenv` in `/api/server/index.js`
2. `loadCustomConfig()` reads `librechat.yaml` (or CONFIG_PATH)
3. Schema validation via Zod in `data-schemas`
4. Endpoints configuration merged with defaults
5. Cached in memory if `cache: true` in YAML
6. Available to all services and routes

## 6. Authentication & Authorization System

### 6.1 Authentication Methods

**Supported strategies** (in `/api/strategies/`):
- **Local**: Email + password stored in User model
- **JWT**: Stateless token authentication
- **OAuth2**: Delegated authentication via social providers
- **OpenID Connect**: Generic OIDC provider
- **SAML**: Enterprise single sign-on
- **LDAP**: Corporate directory

### 6.2 Authorization (Permissions)

**PermissionService** (`/api/server/services/PermissionService.js`):
- Defines roles: admin, user, moderator, etc.
- Resource-based access control (conversations, presets, etc.)
- Fine-grained checks on routes via middleware
- Supports allow/deny lists for resources

**Middleware enforcement**:
- `accessResources` middleware family checks each request
- ACL entries stored in database
- Evaluated per resource type and user

### 6.3 Session Management

- Express-session with configurable stores:
  - Redis (production)
  - Memory store (development)
  - File-based persistence option
- Cookie-based session tracking
- CSRF protection for state-changing operations

## 7. Database Schema

### Core Collections

**User**
- _id, email, password (bcrypt), username
- Roles, avatar, preferences
- Balance (token count), creation date
- OAuth provider associations

**Conversation**
- _id, conversationId (unique), userId
- Title, endpoint, model selection
- Messages array (IDs), files array
- Created/updated timestamps
- Metadata (agent_id, assistant_id, etc.)

**Message**
- _id, conversationId, messageId
- Content, sender role (assistant/user)
- Tool calls, citations, artifacts
- Parent message ID (for tree structure)
- Created/updated timestamps

**File**
- _id, userId, conversationId
- Storage path, mime type, size
- Metadata, processing status
- Viral/clean scan results

**Assistant** (OpenAI)
- _id, assistantId
- Name, instructions, tools, model
- File IDs, metadata

**Agent** (Custom LLM Agents)
- _id, agentId
- Name, description, instructions
- Tools, capabilities
- Model configuration

**Preset**
- _id, userId
- Name, description
- Endpoint, model, parameters
- Conversation defaults

**Other entities**:
- **Prompt**: Reusable prompts with tags, sharing
- **PromptGroup**: Organized prompt collections
- **Role**: Custom role definitions
- **Action**: External API integrations
- **Tool**: Custom tool definitions
- **Transaction**: Spend/earnings logs
- **Balance**: Token balance records
- **ConversationTag**: Message tags for organization
- **Share**: Shared conversation links

### Indexing Strategy

Indexes on frequently queried fields:
- User ID (for all user-owned resources)
- Conversation ID (message lookups)
- Creation date (sorting, pagination)
- Email (user lookup)

## 8. Shared Packages

### /packages/data-schemas
- **Mongoose schemas**: Models for all database entities
- **TypeScript types**: Shared type definitions (TUser, TConversation, etc.)
- **Config schemas**: Zod schemas for librechat.yaml validation
- **Methods**: Database query helpers
- **Logger**: Winston-based logging configuration

### /packages/data-provider
- **HTTP client**: Axios-based request wrapper
- **API endpoints**: URL builders for all backend routes
- **Data service**: High-level functions (queries, mutations)
- **Types**: Request/response types
- **Config**: Client-side config from server

### /packages/api
- **MCP SDK**: Model Context Protocol server implementation
- **Endpoints**: AI provider integration logic
- **Auth utilities**: JWT, OAuth helpers
- **File storage**: S3, Firebase, local abstractions
- **Caching**: Redis/memory cache implementations
- **Tools**: Tool execution framework
- **Types**: TypeScript definitions for API layer

### /packages/client
- **React components**: Shared UI components
- **Hooks**: Custom React hooks
- **Providers**: Context providers
- **Utilities**: Helper functions
- **Styling**: Theme and style utilities

## 9. Build System

### Frontend Build (Vite)
**Config**: `/client/vite.config.ts`

- **Development**: Hot module replacement, proxying to backend
- **Production**: 
  - Rollup bundling with chunking strategy
  - Lazy loading for large libraries (CodeMirror, Monaco, sandpack)
  - Asset compression with gzip
  - Service worker for PWA capabilities
  - CSS/JS minification with terser

**Build output**: `/client/dist/` (served by backend)

### Backend Build
- No build step; runs Node.js directly
- Module aliasing via module-alias package (~/)
- TypeScript compiled from `/packages/*` via Rollup

### Monorepo Build
**Root scripts**:
- `npm run build:packages` - Build all shared packages
- `npm run build:client` - Build frontend
- `npm run build:api` - Build backend packages
- `npm run frontend` - Full frontend pipeline
- `npm run backend:dev` - Development server with nodemon

## 10. Key Patterns & Conventions

### Error Handling
- Try-catch in async functions
- Custom error messages logged with context
- Error middleware catches uncaught exceptions
- Client receives structured error responses

### Validation
- Input validation at route handlers
- Zod schemas for complex objects
- MongoDB schema validation at model level
- Frontend form validation with react-hook-form

### Caching
- Application-level caching in services (getAppConfig)
- MongoDB query lean() for read-only operations
- Redis for session/token caching
- Frontend React Query for HTTP caching

### Logging
- Winston logger (error, info, debug, warn levels)
- Sensitive data redaction in logs
- JSON formatted output for cloud deployments
- Debug mode with detailed object inspection

### Testing
- Jest for unit/integration tests
- Supertest for API endpoint testing
- Mongoose memory-server for database testing
- Playwright for end-to-end testing

### Code Organization
- Controllers for route handlers
- Services for business logic
- Models for database access
- Middleware for cross-cutting concerns
- Utils for reusable functions

## 11. Deployment Architecture

### Docker Setup
- **Dockerfile**: Single-stage production build
- **Dockerfile.multi**: Multi-stage for optimized images
- **docker-compose.yml**: Local development
- **deploy-compose.yml**: Production deployment

### Environment-specific Configs
- Development: .env.local, librechat.yaml
- Production: Environment variables, CONFIG_PATH to remote YAML
- Docker: Volume mounts for config files

### File Storage Options
- **Local**: Files stored on server disk
- **S3**: AWS S3 with presigned URLs
- **Firebase**: Google Cloud Storage integration

Strategies can be mixed per file type (avatar, image, document)

### Reverse Proxy Considerations
- TRUST_PROXY setting for IP detection
- Domain variables (DOMAIN_CLIENT, DOMAIN_SERVER)
- Nginx reverse proxy pattern supported

## 12. Important Files Reference

### Backend
- `/api/server/index.js` - Server entry point
- `/api/server/routes/` - All route definitions
- `/api/server/services/Config/loadCustomConfig.js` - YAML loading
- `/api/models/` - Database model definitions
- `/api/strategies/` - Authentication strategies
- `/api/db/connect.js` - MongoDB connection

### Frontend
- `/client/src/App.jsx` - Root React component
- `/client/src/routes/` - Route definitions
- `/client/src/store/families.ts` - Recoil state
- `/client/src/Providers/` - Context providers
- `/packages/data-provider/src/` - API client layer

### Configuration
- `/librechat.yaml` - Main configuration
- `.env.example` - Environment variable template
- `/packages/data-schemas/src/config/` - Config schemas
- `/client/vite.config.ts` - Frontend build config

## 13. Development Workflow

### Setting Up Locally
1. Install dependencies: `npm install`
2. Configure `.env` with MONGO_URI, API keys
3. Create/copy `librechat.yaml`
4. Start MongoDB: `docker run -d -p 27017:27017 mongo`
5. Start backend: `npm run backend:dev`
6. Start frontend: `npm run frontend:dev` (in another terminal)
7. Access at `http://localhost:3090`

### Running Tests
- Unit tests: `npm test`
- E2E tests: `npm run e2e`
- Specific test: `npm test -- path/to/test.spec.js`

### Code Standards
- ESLint for linting (`npm run lint`, `npm run lint:fix`)
- Prettier for formatting (`npm run format`)
- Pre-commit hooks via husky

## 14. Notable Technical Decisions

### Monorepo Structure
- Enables shared code across frontend/backend
- Clear separation of concerns
- Independent versioning if needed
- Shared TypeScript types prevent drift

### Mongoose ORM
- Document-based, flexible schemas
- Indexing and query optimization
- Built-in validation
- Good Node.js ecosystem fit

### Streaming Responses
- Server-Sent Events for real-time messages
- Chunked transfer for large responses
- Frontend parses incremental updates

### Configuration Flexibility
- YAML for human-readable config
- Environment variables for secrets
- Schema validation prevents invalid configs
- Remote config support for deployments

### Multi-provider Support
- Abstraction layer for endpoints
- Custom endpoints via OpenAI-compatible interface
- Easy to add new providers
- User choice and vendor lock-in prevention

---

**Last Updated**: October 2024
**Version**: 0.8.0
