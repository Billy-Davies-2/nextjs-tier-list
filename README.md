# nextjs-tier-list (Bun + Next.js 15)

The goal of this project is to learn about the **app** router in Next.js and play around with a small SQLite database. The project now uses Bun for package management and scripts.

## Installation

### Clone the repo

```bash
git clone https://github.com/Billy-Davies-2/nextjs-tier-list.git

cd nextjs-tier-list
```

### Install dependencies

```bash
bun install
```

### Start Next.js server

```bash
bun run dev
```

You should be able to navigate to **http://localhost:3000** and start seeing content!

### Other scripts

```bash
# build
bun run build

# start in production
bun run start

# run tests
bun test

# lint code
bun run lint
```

## Security

This project follows security best practices:

### Secure Headers

The application includes security headers configured in `next.config.js`:
- **Strict-Transport-Security**: Enforces HTTPS connections
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts access to sensitive browser APIs
- **Content-Security-Policy**: Mitigates XSS attacks

### Input Validation

All user inputs are validated using Zod schemas. See `lib/validation.ts` for base validation utilities.

### Dependency Scanning

#### Run Security Audit

To check for known vulnerabilities in dependencies:

```bash
bun audit
```

If vulnerabilities are found, update dependencies:

```bash
bun update
```

#### Automated Scanning

- **Dependabot**: Automatically checks for dependency updates weekly
- **CodeQL**: Scans code for security vulnerabilities on every push to main
- **Audit Workflow**: Runs `bun audit` on all pull requests

### Environment Variables

Never commit sensitive data. Create a `.env.local` file for local development:

```bash
# .env.local (not committed to git)
DATABASE_URL=your_database_url
API_KEY=your_api_key
```

All `.env*` files are ignored by git to prevent accidental commits of secrets.

## TODO

- [ ] Serve HTTPS for local dev mode
