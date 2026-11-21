# LeadFlow — Lead Manager

A small, complete lead management application built for the Meru Technosoft Full Stack Developer screening assignment. Sales users can add, browse, search, filter, edit, and delete leads through a responsive UI backed by a REST API and SQLite database.

## Features

- Create and edit leads with name, email, phone, company, source, and status
- Email/password signup and login with private, account-specific lead data
- Search by lead name and filter by status
- Clearly labelled lead statuses and dashboard totals
- Delete confirmation and friendly success/error states
- Server-side pagination and sortable name, status, and date columns
- Validation in both the browser and API
- Persistent SQLite storage with indexes for common queries
- Automated API tests covering CRUD, validation, filters, and counts
- Responsive layout for desktop and mobile

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, and plain CSS
- **Backend:** Node.js, Express 5, TypeScript, and Zod
- **Database:** SQLite via Node's built-in `node:sqlite` module
- **Tests:** Vitest and Supertest

This stack keeps the application simple to run while retaining type safety and clear separation between the UI, API, validation, and persistence layers. SQLite was selected because it requires no external database service for review.

## Run locally

### Requirements

- Node.js 22.5 or newer (Node 24 LTS recommended)
- npm 10 or newer

### Development

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The frontend dev server proxies API requests to <http://localhost:3001>.

### Production build

```bash
npm run build
npm start
```

Open <http://localhost:3001>. Express serves both the compiled frontend and the API.

### Tests

```bash
npm test
```

Tests use an isolated in-memory database and never modify local development data.

## Configuration

Copy `.env.example` values into your environment if the defaults need to change:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Production/API server port |
| `DB_PATH` | `./data/leads.db` | SQLite database file path |

The `data` directory is created automatically. Database files and `.env` files are ignored by Git.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/signup` | Create an account and session |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `GET` | `/api/leads` | List/search/filter/sort/paginate leads |
| `GET` | `/api/leads/stats` | Counts by status |
| `POST` | `/api/leads` | Create a lead |
| `PUT` | `/api/leads/:id` | Replace an existing lead |
| `DELETE` | `/api/leads/:id` | Delete a lead |

List query parameters are `search`, `status`, `sortBy`, `sortOrder`, `page`, and `limit`.

## Assumptions and decisions

- A lead's email does not need to be globally unique; the same contact may represent separate opportunities.
- All six lead fields are required so that records stay useful to sales users.
- Passwords are hashed with Node.js `scrypt`; random session tokens are stored as hashes and sent only through HTTP-only, same-site cookies.
- Every lead query is scoped to the signed-in user so accounts cannot read or change one another's data.
- Delete confirmation uses the browser's native confirmation dialog for a familiar, accessible safeguard.

## With more time

- Add password reset and email verification
- Add database migrations and integration-level frontend tests
- Add accessible custom confirmation and unsaved-change dialogs
- Add CSV import/export and lead activity history
- Deploy the frontend/API and use managed PostgreSQL for production

## Short note

I am particularly happy with the deliberately small architecture: the API performs validated, parameterized queries while the UI handles loading, empty, error, and success states cleanly. The trickiest part was keeping search, status filtering, sorting, pagination, and dashboard counts consistent without making the interface feel busy.
