# SEO Query Insights Dashboard

> An internal tool for SEO specialists to analyze Google Search Console query data and discover optimization opportunities through AI-assisted clustering.

![Node Version](https://img.shields.io/badge/node-22.14.0-brightgreen)
![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Status](https://img.shields.io/badge/status-MVP%20Development-yellow)

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Performance Requirements](#performance-requirements)
- [Project Status](#project-status)
- [License](#license)

## About

The SEO Query Insights Dashboard is an internal tool designed to help SEO specialists analyze and organize Google Search Console (GSC) query data more effectively. The dashboard enables users to identify keyword opportunities, discover semantic relationships between queries, and prioritize content optimization efforts through AI-assisted clustering and opportunity detection.

### Target Users

- SEO team members (non-technical users)
- Internal use only

### Problem Statement

The SEO team currently relies on Google Search Console data but existing tools focus primarily on URL-level metrics. This dashboard addresses the need for query-level insights by providing:

- Efficient identification of semantically related queries
- Detection of underperforming queries with optimization potential
- Tools for organizing queries into meaningful clusters
- Automated analysis of large query datasets

## Features

### Core Functionality

- **Manual Data Import**: Import GSC query data via internal API (shared across all users)
- **Query Performance Visualization**: View impressions, clicks, CTR, and average position for each query
- **Advanced Filtering & Search**: Filter by opportunity status, cluster assignment, and search by query text
- **Custom Query Grouping**: Create, manage, and organize custom query groups (private to each user)
- **AI-Assisted Clustering**: Generate semantic query clusters using text embeddings and K-means algorithm
- **Opportunity Detection**: Automatically flag high-potential queries based on performance metrics
  - Criteria: Impressions > 1,000, CTR < 1%, Average position 5-15
- **User Authentication**: Secure access via username/password for authorized team members

### User Capabilities

- Search and filter queries
- Sort by impressions, CTR, or average position
- Create and manage custom query groups with aggregated metrics
- Review, accept, edit, or discard AI-generated clusters
- Identify and prioritize optimization opportunities

## Tech Stack

### Frontend

- **Astro 5** - Fast, efficient web framework with minimal JavaScript
- **React 19** - Interactive UI components
- **TypeScript 5** - Static type checking and enhanced IDE support
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/ui** - Accessible React component library
- **Lucide React** - Icon library

### Backend

- **Supabase** - Comprehensive backend solution
  - PostgreSQL database
  - Backend-as-a-Service (BaaS)
  - Built-in user authentication
  - Open-source, self-hostable

### AI Integration

- **Openrouter.ai** - AI model access service
  - Multiple model providers (OpenAI, Anthropic, Google, etc.)
  - Cost optimization capabilities
  - API key financial limits

### Testing

- **Vitest** - Unit and integration test framework
- **React Testing Library** - Testing React components and hooks
- **Playwright** - End-to-end (E2E) testing in real browser environments

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

### CI/CD & Hosting

- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean** - Application hosting with Docker

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 22.14.0 (specified in `.nvmrc`)
- **npm**: Comes with Node.js
- **Supabase Account**: For database and authentication setup

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 10xdevs-project
```

### 2. Install Node.js Version

If you use `nvm` (Node Version Manager):

```bash
nvm install
nvm use
```

This will install and use Node.js version 22.14.0 as specified in `.nvmrc`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Setup

Create a `.env` file in the project root and configure the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Openrouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Internal API Configuration
IMPORT_SOURCE_BASE_URL=import_source_base_url

# To use mock data for imports (optional)
USE_MOCK_IMPORT_DATA=true
```

#### Using Mock Data (Temporary Development Solution)

If the real data server is unavailable, you can use mock data for development:

1. Set `USE_MOCK_IMPORT_DATA=true` in your `.env` file
2. You can skip setting `IMPORT_SOURCE_BASE_URL` when using mock data
3. The system will automatically load data from `src/lib/fixtures/gsc_10xdev.json`

### 5. Supabase Setup

#### Local Development

1. Ensure Docker is installed and running on your machine
2. Start the local Supabase instance:
   ```bash
   supabase start
   ```
   This automatically:
   - Creates a local PostgreSQL database
   - Applies all migrations from `supabase/migrations/`
   - Enables email/password authentication
   - Starts Supabase Studio at `http://localhost:54323`

3. Update your `.env` file with local Supabase credentials:
   ```env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_KEY=your_supabase_key
   ```
   The key will be printed in the terminal when you run `supabase start`

#### Remote Deployment (Production)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Set up authentication:
   - Enable email/password provider
   - Configure email confirmations
   - Set appropriate JWT expiry times
3. Apply migrations to your remote database:
   ```bash
   supabase db push --linked
   ```
4. Update your production `.env` file with remote credentials:
   ```env
   SUPABASE_URL=your_remote_supabase_url
   SUPABASE_KEY=your_remote_supabase_key
   ```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:4321` (default Astro port).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready application |
| `npm run preview` | Preview production build locally |
| `npm run astro` | Run Astro CLI commands |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and automatically fix issues |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit and integration tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Generate code coverage report |
| `npm run test:e2e` | Run end-to-end tests with Playwright |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run dev:e2e` | Start dev server in test mode for E2E testing |

## Project Scope

### MVP Includes

✅ Manual data import via internal API  
✅ Query performance metrics visualization  
✅ Search, filter, and sort functionality  
✅ User-created query grouping (private to each user)  
✅ AI-assisted query clustering with K-means  
✅ Automatic opportunity detection  
✅ Basic username/password authentication  
✅ Shared dataset across all users  

### Out of Scope for MVP

❌ Automatic daily imports or scheduled jobs  
❌ Historical trend analysis or time-based visualizations  
❌ Detailed AI-generated content optimization suggestions  
❌ Notifications, reporting exports, or performance alerts  
❌ Role-based access control (beyond basic login)  

### Technical Constraints

- **Data Source**: JSON file accessed via internal API endpoint
- **Data Classification**: Business-sensitive but not PII
- **Authentication**: Simple login/password system for internal team use

## License

License information not specified. Please contact the project maintainers for licensing details.

---

**For Internal Use Only** - This tool is designed exclusively for use by the SEO team.