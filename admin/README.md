# LibreChat Admin Dashboard

A comprehensive admin dashboard for managing LibreChat, built with React, TypeScript, and Vite.

## Features

### ✅ Implemented

- **Dashboard** - System statistics and overview
- **User Management** - View, ban/unban, delete users, and manage token balances
- **Analytics** - Token usage by endpoint, daily trends, top users
- **Governance & Moderation** - View violations, moderation stats, policy management
- **Settings** - System configuration (placeholder)

## Development

### Prerequisites

1. Install dependencies from the monorepo root:
   ```bash
   npm install
   ```

2. Build required packages:
   ```bash
   npm run build:packages
   ```

### Running Locally

1. Start the backend (from root):
   ```bash
   npm run backend:dev
   ```

2. In another terminal, start the admin dashboard dev server:
   ```bash
   npm run admin:dev
   ```

3. Access the admin dashboard at: `http://localhost:3090/admin`

### Building for Production

```bash
# From root
npm run build:admin

# Or from admin directory
cd admin && npm run build
```

The production build will be output to `/admin/dist` and served by the LibreChat backend at `/admin`.

## Authentication

The admin dashboard requires admin role access. To grant a user admin access:

1. Use MongoDB or a database tool to update the user's role:
   ```javascript
   db.users.updateOne(
     { email: 'your-admin@umontana.edu' },
     { $set: { role: 'ADMIN' } }
   )
   ```

2. Or use the LibreChat CLI (if available):
   ```bash
   npm run create-user -- --email admin@umontana.edu --role ADMIN
   ```

## API Endpoints

All admin API endpoints are protected by the `requireAdmin` middleware and mounted at `/api/admin`:

- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users (with search)
- `POST /api/admin/users/:userId/ban` - Ban a user
- `POST /api/admin/users/:userId/unban` - Unban a user
- `DELETE /api/admin/users/:userId` - Delete a user
- `POST /api/admin/users/:userId/balance` - Add/update user token balance
- `GET /api/admin/analytics` - Detailed usage analytics
- `GET /api/admin/violations` - Recent violations
- `GET /api/admin/moderation/stats` - Moderation statistics

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack React Query
- **Routing**: React Router v6
- **Charts**: Chart.js with react-chartjs-2
- **UI Components**: Lucide React icons, Radix UI primitives

## Directory Structure

```
admin/
├── src/
│   ├── components/     # Reusable components
│   │   └── Layout.tsx  # Main layout with navigation
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Analytics.tsx
│   │   ├── Governance.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
│   ├── hooks/          # Custom React hooks
│   │   └── useAuth.ts
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Root app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── dist/               # Production build output
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Next Steps

### Planned Features (Phase 2-4)

- **Enhanced User Management**
  - Bulk operations
  - User creation form
  - Role management UI
  - Department/course grouping

- **Advanced Analytics**
  - Export reports
  - Custom date ranges
  - Cost analysis
  - Model performance metrics

- **Governance Features** (Phase 4)
  - Content moderation rules configuration
  - Keyword blacklists
  - PII detection
  - Compliance audit logs
  - Data retention policies
  - FERPA compliance tools

- **Settings**
  - librechat.yaml editor
  - Feature flag toggles
  - Rate limit configuration
  - Email domain management

## Security

- All routes require ADMIN role
- Session-based authentication
- CSRF protection (inherited from main app)
- No sensitive data in client-side code
- API keys loaded from environment variables

## Troubleshooting

### Admin dashboard shows "not available"
- Make sure you've built the admin dashboard: `npm run build:admin`
- Check backend logs for errors loading admin build

### 403 Forbidden when accessing /api/admin/*
- Verify your user has `role: 'ADMIN'` in the database
- Check backend logs for authentication errors

### Charts not displaying
- Ensure Chart.js is installed: `npm install chart.js react-chartjs-2`
- Check browser console for errors

## Contributing

This admin dashboard is part of the LibreChat monorepo. Follow the main LibreChat contribution guidelines.
