# Contribute

## Technology Stack

This is a TypeScript full-stack project deployed on Cloudflare Pages.

### Frontend and Browser Plugin

- Framework: React
- Build Tool: Vite
- Style: TailwindCSS
- UI Library: Shadcn UI

### Backend

- Framework: Hono
- Database: D1 + Raw SQL
- Storage: R2

## Development Environment Setup

First, you need to install node.js (v20+); the bundled npm is used as the package manager.

### Service Development

- Fork the code, then use `npm install` to install dependencies.
- Execute `npm run init:local` to initialize the local environment.
- Execute `npm run dev:server` to start the backend service.
- Execute `npm run dev:web` to start the frontend service.

### Browser Plugin Development

- Execute `npm run dev:plugin` to start the browser plugin development environment.

## Commit Code

Currently, there are no restrictions on branch names and PR titles, as long as they are understandable.