# Apollo CRM

A cloud-based contact management system with integrated SMS and Email communication, built with Next.js and deployed on AWS.

## Features

- **Contact Management** - Create, search, update, and delete contacts with pagination
- **SMS Communication** - Send single or bulk SMS to contacts via AWS SNS
- **Email Communication** - Send single or bulk emails to contacts via AWS SES
- **Communication History** - Track message status (pending/sent/failed/delivered)
- **Authentication** - Secure login/register with JWT sessions
- **Dark Mode** - Toggle between light and dark themes
- **Responsive UI** - Built with shadcn/ui and Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js v4 |
| SMS | AWS SNS |
| Email | AWS SES |
| UI | shadcn/ui + Tailwind CSS |
| Validation | Zod + React Hook Form |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or AWS RDS)
- AWS account with SNS and SES access

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apollo"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AWS
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-southeast-1"

# SES
SES_FROM_EMAIL="no-reply@yourdomain.com"
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio
npm run db:studio
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login and register pages
│   ├── (dashboard)/     # Protected dashboard pages
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Header, Sidebar, providers
│   ├── contacts/        # Contact-specific components
│   └── communication/   # SMS/Email form components
├── services/            # Business logic layer
├── schemas/             # Zod validation schemas
├── lib/                 # DB client, auth config, AWS clients
├── hooks/               # Custom React hooks
└── types/               # Global TypeScript types
docs/
├── RULE.md              # Project architecture guide
└── AWS_SETUP_GUIDE.md   # AWS infrastructure setup (Vietnamese)
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio UI |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| GET/PUT | `/api/auth/profile` | Get/update profile |
| PUT | `/api/auth/password` | Change password |
| GET/POST | `/api/contacts` | List/create contacts |
| GET/PUT/DELETE | `/api/contacts/[id]` | Contact operations |
| POST | `/api/communication/sms` | Send single SMS |
| POST | `/api/communication/bulk-sms` | Send bulk SMS |
| POST | `/api/communication/email` | Send single email |
| POST | `/api/communication/bulk-email` | Send bulk email |
| GET | `/api/communication/history` | Communication logs |
| GET | `/api/health` | Health check |

## Deployment

See [docs/AWS_SETUP_GUIDE.md](docs/AWS_SETUP_GUIDE.md) for full AWS deployment instructions covering EC2, RDS, SES, SNS, and CloudWatch setup.
