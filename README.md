# Quiztris

A modern web application for creating and managing quizzes with real-time multiplayer capabilities.

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- PostgreSQL database

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/raymondt293/quiztris.git
cd quiztris
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="file:./db.sqlite"

SINGLESTORE_USER="raymond-b38c1"
SINGLESTORE_PASS="=]7K74SVsM1g~e2?)jvJCu"
SINGLESTORE_HOST=svc-3482219c-a389-4079-b18b-d50662524e8a-shared-dml.aws-virginia-6.svc.singlestore.com
SINGLESTORE_PORT=3333
SINGLESTORE_DB_NAME=db_raymond_41303

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bGFzdGluZy10ZXJtaXRlLTU3LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_poH9OLIqb49qZVQkOWt4bbY9NmYyJT69yqaLePaVLG

NEXT_PUBLIC_GLM_API_KEY=AIzaSyCRKkC6eWgvGysUMkAI94KwsFPXRs_wm7Y

NEXT_API_URL=https://quiztris.netlify.app
NEXT_PUBLIC_WS_HOST=
NEXT_PUBLIC_WS_PORT=3001
```

4. Set up the database:

```bash
pnpm drizzle-kit push:pg
```

5. Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Features

- User authentication
- Create and manage quizzes
- Real-time multiplayer quiz sessions
- Admin dashboard for quiz management
- Responsive design for all devices

## Project Structure

- `/src` - Main application source code
  - `/components` - React components
  - `/app` - Next.js app router pages
  - `/lib` - Utility functions and shared code
- `/drizzle` - Database schema and migrations
- `/websocket-server` - Real-time communication server

## Development

- Run tests: `pnpm test`
- Build for production: `pnpm build`
- Start production server: `pnpm start`

