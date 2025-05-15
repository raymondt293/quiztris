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
DATABASE_URL=

SINGLESTORE_USER=
SINGLESTORE_PASS=
SINGLESTORE_HOST=
SINGLESTORE_PORT=
SINGLESTORE_DB_NAME=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_GLM_API_KEY=
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

