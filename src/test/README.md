# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for end-to-end tests.

## Test Structure

```
src/test/
├── setup.ts          # Vitest global setup file
├── utils.tsx         # Testing utilities and custom render
├── unit/             # Unit and integration tests
└── e2e/              # End-to-end tests
```

## Unit Tests (Vitest)

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI mode
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Writing Unit Tests

Unit tests should be placed in `src/test/unit/` or alongside the source files with `.test.ts` or `.spec.ts` extension.

### Key Features

- **happy-dom environment** for DOM testing
- **@testing-library/react** for React component testing
- **@testing-library/jest-dom** matchers for assertions
- **Custom render utility** in `src/test/utils.tsx`
- **Global mocks** configured in `src/test/setup.ts`

## E2E Tests (Playwright)

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Record new tests with codegen
npm run test:e2e:codegen

# Debug tests
npm run test:e2e:debug
```

### Writing E2E Tests

E2E tests should be placed in `src/test/e2e/` with `.spec.ts` extension.

### Key Features

- **Chromium only** (as per project guidelines)
- **Automatic dev server** starts before tests
- **Trace viewer** enabled for debugging
- **HTML reporter** for test results
- **Parallel execution** for faster test runs

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `src/test/setup.ts` - Global test setup and mocks

