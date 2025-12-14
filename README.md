# nextjs-tier-list (Bun + Next.js 16)

The goal of this project is to learn about the **app** router in Next.js and play around with a small SQLite database. The project uses Bun for package management and scripts.

## Tech Stack

- **Next.js 16.0.10** - React framework with App Router
- **React 19.2.3** - Latest stable React
- **TypeScript 5.9.3** - Type safety
- **Tailwind CSS 4.1.18** - Styling
- **tRPC 11.8.0** - End-to-end typesafe APIs
- **TanStack Query 5.90.12** - Data fetching
- **Zod 4.1.13** - Schema validation
- **Bun 1.3.4** - Runtime and package manager

## Installation

### Clone the repo

```bash
git clone https://github.com/Billy-Davies-2/nextjs-tier-list.git

cd nextjs-tier-list
```

### Start Next.js server

```bash
bun run dev
```

You should be able to navigate to **http://localhost:3000** and start seeing content!

### Other scripts

```bash
# install deps
bun install

# build
bun run build

# start in production
bun run start
```

## TODO

- [ ] Serve HTTPS for local dev mode

## Recent Updates

### December 2024 - Dependency Upgrades

All dependencies have been upgraded to their latest stable versions:
- Upgraded Next.js from 15.5.2 to 16.0.10
- Upgraded React from 19.1.1 to 19.2.3  
- Upgraded Zod from 3.x to 4.1.13 (major version)
- Upgraded all tRPC packages from 11.5.1 to 11.8.0
- Upgraded TanStack Query from 5.87.1 to 5.90.12
- Added security headers to next.config.js
- Added Dependabot and CodeQL workflows for automated dependency updates and security scanning

**Note:** Zod 4.x is a major version upgrade but is backward compatible for the schemas used in this project.
