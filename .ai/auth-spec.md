# Authentication Architecture Specification

## Document Overview

This specification defines the authentication architecture for the SEO Query Insights Dashboard MVP, implementing user stories US-000, US-001, and US-002 using Supabase Auth integrated with Astro 5 SSR.

**Stack**: Astro 5, React 19, TypeScript 5, Supabase Auth, Tailwind 4, Shadcn/ui

**Compatibility**: This design preserves all existing application functionality while adding authentication guards. The existing API structure and data models remain unchanged.

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 New Pages and Components

#### 1.1.1 Authentication Pages (Astro)

**Location**: `src/pages/`

##### `/login.astro`
- **Purpose**: User login form
- **Type**: Astro page with server-side rendering
- **Behavior**:
  - If user is already authenticated (checked via middleware), redirect to `/queries`
  - Render login form component (React)
  - Handle successful login by setting session cookies and redirecting to `/queries`
  - Display authentication errors returned from API
- **Layout**: Standalone page without `Layout.astro` (no side navigation)
- **Styling**: Centered card with form, branded with app logo

##### `/register.astro`
- **Purpose**: User registration form
- **Type**: Astro page with server-side rendering
- **Behavior**:
  - If user is already authenticated, redirect to `/queries`
  - Render registration form component (React)
  - Handle successful registration by setting session cookies and redirecting to `/queries`
  - Display validation and registration errors
- **Layout**: Standalone page without `Layout.astro`
- **Styling**: Centered card with form, branded with app logo

##### `/forgot-password.astro`
- **Purpose**: Password recovery initiation
- **Type**: Astro page with server-side rendering
- **Behavior**:
  - Email input form to request password reset
  - Display success message with instructions to check email
  - Display errors if email sending fails
- **Layout**: Standalone page without `Layout.astro`
- **Styling**: Centered card with form

##### `/reset-password.astro`
- **Purpose**: Password reset completion
- **Type**: Astro page with server-side rendering
- **Behavior**:
  - Validates reset token from URL query parameters (received via email link)
  - If token is invalid/expired, display error and link to forgot password page
  - Renders password reset form (new password + confirmation)
  - On success, redirects to login with success message
- **Layout**: Standalone page without `Layout.astro`
- **Styling**: Centered card with form

#### 1.1.2 React Form Components

**Location**: `src/components/auth/`

##### `LoginForm.tsx`
- **Purpose**: Interactive login form
- **Props**: None
- **State**:
  - `email: string`
  - `password: string`
  - `isLoading: boolean`
  - `error: string | null`
- **Validation**:
  - Email: Required, valid email format
  - Password: Required, minimum 6 characters
  - Display inline validation errors on blur
- **Actions**:
  - `onSubmit`: POST to `/api/auth/login` with credentials
  - On success: Reload page (middleware will redirect to `/queries`)
  - On error: Display error message below form
- **UI Components**: Input (email), Input (password), Button (submit), Label, error alert
- **Features**: Show/hide password toggle, "Forgot password?" link

##### `RegisterForm.tsx`
- **Purpose**: Interactive registration form
- **Props**: None
- **State**:
  - `email: string`
  - `password: string`
  - `confirmPassword: string`
  - `isLoading: boolean`
  - `error: string | null`
- **Validation**:
  - Email: Required, valid email format, not already registered
  - Password: Required, minimum 6 characters, meets strength requirements
  - Confirm Password: Required, must match password
  - Display inline validation errors on blur
  - Display password strength indicator
- **Actions**:
  - `onSubmit`: POST to `/api/auth/register` with credentials
  - On success: Reload page (middleware will redirect to `/queries`)
  - On error: Display error message (e.g., "Email already exists")
- **UI Components**: Input (email), Input (password), Input (confirm password), Button (submit), Label, error alert
- **Features**: Show/hide password toggles, "Already have an account? Log in" link

##### `ForgotPasswordForm.tsx`
- **Purpose**: Request password reset email
- **Props**: None
- **State**:
  - `email: string`
  - `isLoading: boolean`
  - `error: string | null`
  - `success: boolean`
- **Validation**:
  - Email: Required, valid email format
- **Actions**:
  - `onSubmit`: POST to `/api/auth/forgot-password` with email
  - On success: Display success message with instructions
  - On error: Display error message
- **UI Components**: Input (email), Button (submit), Label, success/error alerts
- **Features**: "Back to login" link

##### `ResetPasswordForm.tsx`
- **Purpose**: Set new password after reset
- **Props**: 
  - `token: string` (from URL query)
- **State**:
  - `password: string`
  - `confirmPassword: string`
  - `isLoading: boolean`
  - `error: string | null`
- **Validation**:
  - Password: Required, minimum 6 characters, meets strength requirements
  - Confirm Password: Required, must match password
  - Display inline validation errors on blur
  - Display password strength indicator
- **Actions**:
  - `onSubmit`: POST to `/api/auth/reset-password` with token and new password
  - On success: Redirect to `/login` with success toast
  - On error: Display error message
- **UI Components**: Input (password), Input (confirm password), Button (submit), Label, error alert
- **Features**: Show/hide password toggles

##### `AuthLoadingSpinner.tsx`
- **Purpose**: Loading state during authentication operations
- **Props**: None
- **UI**: Centered spinner with "Authenticating..." text
- **Usage**: Shown while checking authentication state on protected pages

#### 1.1.3 Navigation Component Updates

**File**: `src/components/navigation/SideNav.tsx`

**Changes Required**:
- Add user profile section at top or bottom of navigation
- Display current user's email
- Add "Log Out" button
- **State Management**:
  - Fetch current user from `/api/auth/me` on mount
  - Display loading state while fetching
  - Handle logout action via `/api/auth/logout`

**UI Elements to Add**:
```
┌─────────────────────────┐
│ User Section            │
│ ┌─────────────────────┐ │
│ │ 👤 user@example.com │ │
│ │ [Log Out Button]    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### 1.1.4 Layout Component Updates

**File**: `src/layouts/Layout.astro`

**Changes Required**:
- **No visual changes** - layout remains the same for authenticated users
- The middleware will handle redirecting unauthenticated users before reaching this layout
- Layout continues to render SideNav and main content area as before

### 1.2 Authentication Flow Scenarios

#### 1.2.1 User Registration Flow
1. User navigates to `/register`
2. Server checks authentication in middleware → user is not logged in → page renders
3. User fills form (email, password, confirm password)
4. Client-side validation on blur and submit
5. On submit: POST `/api/auth/register` with form data
6. Server validates, creates user in Supabase Auth
7. Server creates session and sets HTTP-only cookie
8. Client receives success response
9. Page reloads, middleware detects authenticated session
10. Middleware redirects to `/queries`

#### 1.2.2 User Login Flow
1. User navigates to `/login`
2. Server checks authentication in middleware → user is not logged in → page renders
3. User fills form (email, password)
4. Client-side validation on blur and submit
5. On submit: POST `/api/auth/login` with credentials
6. Server validates credentials via Supabase Auth
7. Server creates session and sets HTTP-only cookie
8. Client receives success response
9. Page reloads, middleware detects authenticated session
10. Middleware redirects to `/queries`

#### 1.2.3 User Logout Flow
1. User clicks "Log Out" button in SideNav
2. Client: POST `/api/auth/logout`
3. Server revokes session via Supabase Auth
4. Server clears session cookie
5. Client receives success response
6. Page reloads or redirects to `/login`
7. Middleware detects no session → allows access to `/login`

#### 1.2.4 Password Recovery Flow
1. User navigates to `/forgot-password`
2. User enters email and submits
3. POST `/api/auth/forgot-password` with email
4. Server sends password reset email via Supabase Auth (email contains link: `https://app.com/reset-password?token=xxx`)
5. User receives email and clicks link
6. User navigates to `/reset-password?token=xxx`
7. Page validates token, renders password reset form
8. User enters new password and confirms
9. POST `/api/auth/reset-password` with token and new password
10. Server updates password via Supabase Auth
11. User redirected to `/login` with success message

#### 1.2.5 Protected Page Access (Unauthenticated)
1. User navigates to `/queries` (or any protected page)
2. Middleware checks for valid session → none found
3. Middleware redirects to `/login?redirect=/queries`
4. Login page displays
5. After successful login, user redirected to original destination (`/queries`)

#### 1.2.6 Protected Page Access (Authenticated)
1. User navigates to `/queries`
2. Middleware checks for valid session → session found
3. Middleware validates session with Supabase Auth
4. Middleware injects user data into `context.locals.user`
5. Page renders normally with user context

### 1.3 Form Validation Rules

#### Email Validation
- **Required**: Yes
- **Format**: Valid email (RFC 5322 compliant)
- **Trim**: Whitespace trimmed
- **Error Messages**:
  - Empty: "Email is required"
  - Invalid format: "Please enter a valid email address"
  - Already exists (registration): "This email is already registered"

#### Password Validation (Registration & Reset)
- **Required**: Yes
- **Minimum Length**: 6 characters (per Supabase config)
- **Strength Requirements**: Configurable via Supabase (default: none for MVP)
- **Error Messages**:
  - Empty: "Password is required"
  - Too short: "Password must be at least 6 characters"

#### Confirm Password Validation
- **Required**: Yes
- **Must Match**: Must equal password field
- **Error Messages**:
  - Empty: "Please confirm your password"
  - Mismatch: "Passwords do not match"

#### Login Password Validation
- **Required**: Yes
- **Minimum Length**: None (only checked at registration)
- **Error Messages**:
  - Empty: "Password is required"
  - Incorrect (from server): "Invalid email or password"

### 1.4 Error Display Strategy

#### Client-Side Validation Errors
- **Display**: Inline below field with red text and icon
- **Timing**: On blur and on submit attempt
- **Styling**: Text-destructive color, small font size
- **Accessibility**: Error messages linked to fields via `aria-describedby`

#### Server-Side Errors
- **Display**: Alert component above form
- **Types**:
  - Validation errors (400): "Invalid email or password"
  - Conflict errors (409): "This email is already registered"
  - Server errors (500): "An unexpected error occurred. Please try again."
  - Network errors: "Unable to connect. Please check your connection."
- **Styling**: Alert variant="destructive" from Shadcn/ui
- **Dismissible**: Yes, with close button
- **Auto-dismiss**: No (user must dismiss or navigate away)

#### Success Messages
- **Password Reset Request**: Success alert on same page: "If an account exists for this email, you will receive password reset instructions."
- **Password Reset Complete**: Toast notification on login page: "Password successfully reset. Please log in."
- **Logout**: Optional toast: "You have been logged out"

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints

**Location**: `src/pages/api/auth/`

#### 2.1.1 `POST /api/auth/register`

**File**: `src/pages/api/auth/register.ts`

**Purpose**: Create new user account

**Request Schema** (Zod):
```typescript
{
  email: string (email format, trim),
  password: string (min 6 chars),
  confirmPassword: string (must match password)
}
```

**Processing**:
1. Validate request body with Zod schema
2. Check password match
3. Call `supabase.auth.signUp({ email, password })`
4. If error (e.g., email exists), return 409 Conflict
5. On success, retrieve session from response
6. Set HTTP-only session cookie (`sb-access-token`, `sb-refresh-token`)
7. Log user action: `user_actions` table with `action_type = "register"`
8. Return 201 Created with user data

**Response** (201):
```typescript
{
  user: {
    id: string,
    email: string,
    createdAt: string
  }
}
```

**Error Responses**:
- 400: Validation error (invalid email, password too short, passwords don't match)
- 409: Email already registered
- 500: Internal server error

**Security**:
- Passwords never logged or exposed in responses

#### 2.1.2 `POST /api/auth/login`

**File**: `src/pages/api/auth/login.ts`

**Purpose**: Authenticate user and create session

**Request Schema** (Zod):
```typescript
{
  email: string (email format, trim),
  password: string (required)
}
```

**Processing**:
1. Validate request body with Zod schema
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. If error (invalid credentials), return 401 Unauthorized
4. On success, retrieve session from response
5. Set HTTP-only session cookie (`sb-access-token`, `sb-refresh-token`)
6. Log user action: `user_actions` table with `action_type = "login"`
7. Return 200 OK with user data

**Response** (200):
```typescript
{
  user: {
    id: string,
    email: string,
    createdAt: string
  }
}
```

**Error Responses**:
- 400: Validation error (invalid request format)
- 401: Invalid credentials
- 500: Internal server error

**Security**:
- Credentials validated server-side only
- Failed login attempts tracked by Supabase Auth

#### 2.1.3 `POST /api/auth/logout`

**File**: `src/pages/api/auth/logout.ts`

**Purpose**: Revoke user session

**Request**: No body required

**Authentication**: Required (session must exist)

**Processing**:
1. Extract session from cookies
2. Call `supabase.auth.signOut()`
3. Clear session cookies
4. Log user action: `user_actions` table with `action_type = "logout"`
5. Return 204 No Content

**Response**: 204 No Content

**Error Responses**:
- 401: No valid session found
- 500: Internal server error

**Security**:
- Revokes all active sessions for the user (Supabase default behavior)
- Cookies cleared with same attributes used to set them

#### 2.1.4 `GET /api/auth/me`

**File**: `src/pages/api/auth/me.ts`

**Purpose**: Get current authenticated user

**Authentication**: Required

**Processing**:
1. Extract session from cookies
2. Call `supabase.auth.getUser()` to validate session
3. If session invalid, return 401
4. Return user data

**Response** (200):
```typescript
{
  user: {
    id: string,
    email: string,
    createdAt: string
  }
}
```

**Error Responses**:
- 401: Not authenticated or session expired
- 500: Internal server error

**Usage**: Called by SideNav component to display user info

#### 2.1.5 `POST /api/auth/forgot-password`

**File**: `src/pages/api/auth/forgot-password.ts`

**Purpose**: Initiate password reset flow

**Request Schema** (Zod):
```typescript
{
  email: string (email format, trim)
}
```

**Processing**:
1. Validate request body with Zod schema
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'http://app.com/reset-password' })`
3. Supabase sends email with reset link (contains token)
4. Always return success (don't reveal if email exists - security best practice)
5. Return 200 OK

**Response** (200):
```typescript
{
  message: "If an account exists for this email, you will receive password reset instructions."
}
```

**Error Responses**:
- 400: Validation error (invalid email format)
- 500: Internal server error

**Security**:
- Generic success message prevents email enumeration
- Reset tokens expire after 1 hour (Supabase default)

#### 2.1.6 `POST /api/auth/reset-password`

**File**: `src/pages/api/auth/reset-password.ts`

**Purpose**: Complete password reset with new password

**Request Schema** (Zod):
```typescript
{
  token: string (required, from URL),
  password: string (min 6 chars),
  confirmPassword: string (must match password)
}
```

**Processing**:
1. Validate request body with Zod schema
2. Check password match
3. Call `supabase.auth.updateUser({ password: newPassword })` with token in session context
4. If token invalid/expired, return 400
5. On success, return 200 OK
6. Client redirects to login

**Response** (200):
```typescript
{
  message: "Password successfully reset. Please log in with your new password."
}
```

**Error Responses**:
- 400: Invalid/expired token or validation error
- 500: Internal server error

**Security**:
- Tokens single-use and expire after 1 hour
- Password validation same as registration
- Old sessions invalidated after password reset

### 2.2 Zod Validation Schemas

**Location**: `src/pages/api/auth/_schemas.ts`

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address")
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
```

### 2.3 Service Layer

**Location**: `src/lib/auth/`

#### `service.ts`
```typescript
// Auth service functions that wrap Supabase Auth

export async function registerUser(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ user: UserDto; session: Session } | { error: string }>

export async function loginUser(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ user: UserDto; session: Session } | { error: string }>

export async function logoutUser(
  supabase: SupabaseClient<Database>
): Promise<{ success: boolean; error?: string }>

export async function getCurrentUser(
  supabase: SupabaseClient<Database>
): Promise<{ user: UserDto } | { error: string }>

export async function sendPasswordReset(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<{ success: boolean; error?: string }>

export async function resetPassword(
  supabase: SupabaseClient<Database>,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }>
```

**Purpose**: 
- Encapsulate Supabase Auth calls
- Transform Supabase responses to application DTOs
- Provide consistent error handling
- Simplify testing and mocking

#### `session.ts`
```typescript
// Cookie management utilities

export function setAuthCookies(
  cookies: AstroCookies,
  session: Session
): void

export function clearAuthCookies(
  cookies: AstroCookies
): void

export function getSessionFromCookies(
  cookies: AstroCookies
): { accessToken: string; refreshToken: string } | null
```

**Purpose**:
- Centralize cookie management
- Define cookie attributes (HttpOnly, Secure, SameSite, path, maxAge)
- Ensure consistent cookie handling across endpoints

**Cookie Attributes**:
- `sb-access-token`: HttpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age=3600
- `sb-refresh-token`: HttpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age=604800

### 2.4 Type Definitions

**Location**: `src/types.ts` (already partially exists)

**Additions**:
```typescript
// Auth DTOs (already defined in types.ts, shown for completeness)
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
}

export interface LoginResponseDto {
  user: UserDto;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthErrorResponse extends ErrorResponse {
  error: {
    code: "validation_error" | "unauthorized" | "conflict" | "rate_limited" | "internal";
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### 2.5 Middleware Updates

**File**: `src/middleware/index.ts`

**Current State**: Injects Supabase client into `context.locals.supabase`

**Required Changes**:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password"
];

// Assets and static files (always public)
const PUBLIC_PATTERNS = [
  /^\/favicon\.png$/,
  /^\/_astro\//,
  /^\/api\/health$/
];

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Inject Supabase client (existing behavior)
  context.locals.supabase = supabaseClient;

  const { url, cookies, redirect } = context;
  const pathname = new URL(url).pathname;

  // 2. Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || 
    PUBLIC_PATTERNS.some(pattern => pattern.test(pathname));

  if (isPublicRoute) {
    return next();
  }

  // 3. Check for valid session
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken) {
    // No session, redirect to login with return URL
    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // 4. Validate session with Supabase
  const { data: { user }, error } = await supabaseClient.auth.getUser(accessToken);

  if (error || !user) {
    // Invalid session, clear cookies and redirect
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // 5. Inject authenticated user into context
  context.locals.user = {
    id: user.id,
    email: user.email!,
    createdAt: user.created_at
  };

  // 6. Check if session is about to expire and refresh if needed
  // (Optional enhancement - can be added in v2)

  return next();
});
```

**Key Behaviors**:
- Public routes (login, register, etc.) bypass authentication
- Protected routes require valid session cookie
- Invalid/missing sessions redirect to login with return URL
- Valid sessions inject user data into `context.locals.user`
- Failed authentication clears stale cookies

### 2.6 Type Extensions

**File**: `src/env.d.ts`

**Updates**:
```typescript
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {  // New: injected by middleware for authenticated requests
        id: string;
        email: string;
        createdAt: string;
      };
    }
  }
}
```

### 2.7 Existing API Endpoints Updates

**Affected Files**: All API routes in `src/pages/api/` (except `auth/`)

**New Pattern**:
```typescript
export const GET: APIRoute = async ({ locals, request }) => {
  // Get authenticated user from middleware
  const user = locals.user;
  
  if (!user) {
    // Should not happen if middleware is working correctly, but defensive check
    const errorResponse: ErrorResponse = {
      error: {
        code: "unauthorized",
        message: "Authentication required"
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const userId = user.id;
  // ... rest of existing logic unchanged
}
```

**Files to Update**:
- `src/pages/api/groups/index.ts`
- `src/pages/api/groups/[groupId].ts`
- `src/pages/api/groups/[groupId]/items.ts`
- `src/pages/api/groups/[groupId]/items/[queryId].ts`
- `src/pages/api/ai-clusters/index.ts`
- `src/pages/api/ai-clusters/accept.ts`
- `src/pages/api/import.ts`
- `src/pages/api/queries.ts`

**Impact**: Minimal - only replacing hardcoded `userId` with `locals.user.id`

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Configuration

**Location**: `supabase/config.toml` (already configured)

**Key Settings** (already present):
- `enable_signup = true` - Allow new user registration
- `minimum_password_length = 6` - Password length requirement
- `jwt_expiry = 3600` - Access token expires in 1 hour
- `enable_refresh_token_rotation = true` - Security best practice
- `site_url = "http://127.0.0.1:3000"` - Base URL for email links
- `email_sent = 2` - Rate limit: 2 emails per hour (password reset)

**Email Templates**: Supabase default templates used for MVP
- Password reset email with link to `/reset-password?token={token}`
- Welcome email (optional, can be disabled)

**No Additional Configuration Required**: Existing Supabase setup is sufficient

### 3.2 Session Management

#### Token Storage Strategy
- **Access Token**: Stored in HTTP-only cookie `sb-access-token`
- **Refresh Token**: Stored in HTTP-only cookie `sb-refresh-token`
- **Rationale**: HTTP-only cookies prevent XSS attacks, more secure than localStorage

#### Session Lifecycle
1. **Creation**: On login/register, Supabase returns session (access + refresh tokens)
2. **Storage**: Tokens stored in HTTP-only cookies via API response
3. **Validation**: Middleware validates access token on each request
4. **Refresh**: When access token expires, client calls `/api/auth/refresh` (future enhancement)
5. **Revocation**: On logout, session revoked and cookies cleared

#### Session Duration
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 1 week (604800 seconds)
- **Sliding Window**: Refresh tokens extend session if user is active

#### Cookie Configuration
```typescript
// src/lib/auth/session.ts

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD, // HTTPS only in production
  sameSite: "lax" as const,
  path: "/",
  maxAge: 3600 // 1 hour for access token
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800 // 1 week for refresh token
};
```

### 3.3 Authentication Flow Integration

#### Client → Server Communication
1. **Client**: Form submission via fetch/axios
2. **Request**: POST to `/api/auth/login` with JSON body
3. **Server**: Validates credentials, creates session
4. **Response**: Sets cookies via `Set-Cookie` headers, returns user data
5. **Client**: Receives response, reloads page
6. **Middleware**: Detects session, redirects to protected page

#### Server → Supabase Communication
1. **API Endpoint**: Receives request with credentials
2. **Supabase Client**: Calls `supabase.auth.signInWithPassword()`
3. **Supabase Service**: Validates credentials against `auth.users` table
4. **Response**: Returns session object or error
5. **API Endpoint**: Processes response, sets cookies, returns to client

#### Diagram: Login Flow
```
┌──────────┐     1. POST /api/auth/login      ┌────────────┐
│  Client  │ ──────────────────────────────> │ API Endpoint│
│ (Browser)│                                  │             │
└──────────┘                                  └────────────┘
     ↑                                               │
     │                                               │ 2. signInWithPassword
     │                                               ↓
     │                                        ┌────────────┐
     │                                        │  Supabase  │
     │                                        │    Auth    │
     │                                        └────────────┘
     │                                               │
     │                                               │ 3. Validate & return session
     │                                               ↓
     │         5. Response + Set-Cookie       ┌────────────┐
     │ <────────────────────────────────────  │ API Endpoint│
     │                                         └────────────┘
     │
     │ 6. Reload page
     ↓
┌──────────┐     7. GET /queries              ┌────────────┐
│  Client  │ ──────────────────────────────>  │ Middleware │
│ (Browser)│    (with session cookies)        │            │
└──────────┘                                   └────────────┘
     ↑                                               │
     │                                               │ 8. Validate session
     │                                               ↓
     │                                        ┌────────────┐
     │                                        │  Supabase  │
     │                                        │    Auth    │
     │                                        └────────────┘
     │                                               │
     │         10. Render protected page            │ 9. Session valid
     │ <───────────────────────────────────────────┘
```

### 3.4 Row-Level Security (RLS)

**Location**: Supabase database policies (already defined in migrations)

**Affected Tables**:
- `groups` - User can only access their own groups
- `group_items` - User can only access items from their groups
- `user_actions` - User can only access their own actions

**RLS Policies** (already commented in migrations, need to be uncommented):

#### `groups` table
```sql
-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view only their own groups
CREATE POLICY "groups_select_own" 
ON groups FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- INSERT: Users can create their own groups
CREATE POLICY "groups_insert_own" 
ON groups FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own groups
CREATE POLICY "groups_update_own" 
ON groups FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own groups
CREATE POLICY "groups_delete_own" 
ON groups FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```

#### `group_items` table
```sql
ALTER TABLE group_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_items_select_own" 
ON group_items FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = group_items.group_id 
  AND groups.user_id = auth.uid()
));

CREATE POLICY "group_items_insert_own" 
ON group_items FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = group_items.group_id 
  AND groups.user_id = auth.uid()
));

CREATE POLICY "group_items_delete_own" 
ON group_items FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = group_items.group_id 
  AND groups.user_id = auth.uid()
));
```

#### `user_actions` table
```sql
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_actions_select_own" 
ON user_actions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "user_actions_insert_own" 
ON user_actions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
```

#### `queries` table
**No RLS**: Queries are shared across all authenticated users (per PRD requirement)

**Migration File Required**: `supabase/migrations/20251103000000_enable_rls.sql`

### 3.5 Security Considerations

#### Password Security
- Minimum length: 6 characters (configurable in Supabase)
- Hashed with bcrypt by Supabase (automatic)
- Never stored or logged in plain text
- Password strength indicator in UI (optional enhancement)

#### Session Security
- HTTP-only cookies prevent XSS access
- Secure flag in production (HTTPS only)
- SameSite=Lax prevents CSRF attacks
- Short-lived access tokens (1 hour)
- Refresh token rotation prevents token reuse

#### API Security
- Rate limiting via Supabase Auth (already configured)
- CORS restricted to same origin (Astro default)
- Input validation with Zod on all endpoints
- SQL injection prevented by Supabase client (parameterized queries)
- Authentication required for all protected endpoints

#### Error Handling
- Generic error messages prevent information disclosure
  - Login: "Invalid email or password" (don't reveal which is wrong)
  - Password reset: "If an account exists..." (don't reveal if email is registered)
- Detailed errors logged server-side, not exposed to client
- Stack traces never sent to client in production

#### HTTPS Requirements
- **Development**: HTTP allowed (localhost)
- **Production**: HTTPS enforced via cookie `Secure` flag
- Email links use HTTPS in production (configured via `site_url` in Supabase)

---

## 4. IMPLEMENTATION CHECKLIST

### 4.1 Database Migrations
- [ ] Create migration to enable RLS on `groups`, `group_items`, `user_actions` tables
- [ ] Define RLS policies for each table (uncomment from existing migrations)
- [ ] Test RLS policies with different users
- [ ] Verify `queries` table remains accessible to all authenticated users

### 4.2 Backend Implementation
- [ ] Create auth service layer (`src/lib/auth/service.ts`)
- [ ] Create session management utilities (`src/lib/auth/session.ts`)
- [ ] Create Zod validation schemas (`src/pages/api/auth/_schemas.ts`)
- [ ] Implement `POST /api/auth/register` endpoint
- [ ] Implement `POST /api/auth/login` endpoint
- [ ] Implement `POST /api/auth/logout` endpoint
- [ ] Implement `GET /api/auth/me` endpoint
- [ ] Implement `POST /api/auth/forgot-password` endpoint
- [ ] Implement `POST /api/auth/reset-password` endpoint
- [ ] Update middleware to check authentication and inject user
- [ ] Update all existing API endpoints to use `locals.user.id` instead of hardcoded userId
- [ ] Test all endpoints with valid and invalid sessions

### 4.3 Frontend Implementation
- [ ] Create `LoginForm.tsx` component with validation
- [ ] Create `RegisterForm.tsx` component with validation
- [ ] Create `ForgotPasswordForm.tsx` component
- [ ] Create `ResetPasswordForm.tsx` component
- [ ] Create `AuthLoadingSpinner.tsx` component
- [ ] Create `/login.astro` page
- [ ] Create `/register.astro` page
- [ ] Create `/forgot-password.astro` page
- [ ] Create `/reset-password.astro` page
- [ ] Update `SideNav.tsx` to show user info and logout button
- [ ] Add navigation links between auth pages (login ↔ register, forgot password, etc.)
- [ ] Test form validation (client-side)
- [ ] Test error display (inline and alert)
- [ ] Test responsive design on mobile

### 4.4 Integration Testing
- [ ] Test complete registration flow (form → API → database → session → redirect)
- [ ] Test complete login flow (form → API → session → redirect)
- [ ] Test logout flow (button → API → clear session → redirect)
- [ ] Test password recovery flow (forgot → email → reset → login)
- [ ] Test protected page access without authentication (redirect to login)
- [ ] Test protected page access with authentication (allow access)
- [ ] Test session expiration handling
- [ ] Test invalid token handling (password reset)
- [ ] Test concurrent sessions (same user, different browsers)
- [ ] Test "remember me" functionality (via refresh token)

### 4.5 Security Testing
- [ ] Verify cookies are HTTP-only (inspect in DevTools)
- [ ] Verify cookies have Secure flag in production
- [ ] Verify XSS prevention (try injecting scripts in forms)
- [ ] Verify CSRF protection (SameSite cookie attribute)
- [ ] Verify rate limiting (try multiple failed logins)
- [ ] Verify password not exposed in network logs
- [ ] Verify RLS policies prevent cross-user data access
- [ ] Verify error messages don't leak sensitive info

### 4.6 Documentation
- [ ] Update README with authentication setup instructions
- [ ] Document environment variables required (SUPABASE_URL, SUPABASE_KEY)
- [ ] Document authentication flow for developers
- [ ] Document how to test locally with Supabase
- [ ] Add inline code comments for complex authentication logic

---

## 5. COMPATIBILITY NOTES

### 5.1 No Breaking Changes
- All existing functionality preserved
- Database schema unchanged (only RLS policies added)
- API contracts unchanged (only userId source changed)
- UI/UX unchanged for authenticated users

### 5.2 Migration Path
1. Deploy authentication endpoints and middleware
2. Existing users continue using app with hardcoded userId (during transition)
3. Enable RLS policies after all users have accounts
4. Remove hardcoded userId fallback

### 5.3 Data Continuity
- Existing `groups` and `group_items` records associated with hardcoded userId
- After migration, assign existing data to correct users (one-time script)
- No data loss during migration

---

## 6. FUTURE ENHANCEMENTS (Post-MVP)

### 6.1 Session Management
- Automatic token refresh before expiration
- "Remember me" checkbox (extend refresh token duration)
- Multi-device session management (view and revoke sessions)

### 6.2 User Profile
- Update email address
- Change password (while logged in)
- Account deletion

### 6.3 Security
- Two-factor authentication (2FA)
- Email verification requirement
- Password strength enforcement (uppercase, lowercase, numbers, symbols)
- Login activity log (IP addresses, device info)

### 6.4 Social Login
- Google OAuth
- GitHub OAuth

### 6.5 Admin Features
- User management dashboard (view, suspend, delete users)
- Audit log of user actions

---

## 7. TESTING SCENARIOS

### 7.1 Happy Path Scenarios

**Scenario 1: New User Registration**
- User navigates to `/register`
- User fills form with valid email and password
- User submits form
- Account created, session established
- User redirected to `/queries`
- User sees dashboard with their data

**Scenario 2: Existing User Login**
- User navigates to `/login`
- User enters correct credentials
- User submits form
- Session established
- User redirected to `/queries`
- User sees dashboard with their data

**Scenario 3: Password Recovery**
- User navigates to `/forgot-password`
- User enters email
- User receives reset email
- User clicks link in email
- User navigates to `/reset-password?token=xxx`
- User enters new password
- Password updated
- User redirected to `/login`
- User logs in with new password

**Scenario 4: User Logout**
- Authenticated user clicks "Log Out" in SideNav
- Session revoked
- User redirected to `/login`
- User cannot access protected pages until logging in again

### 7.2 Error Scenarios

**Scenario 5: Registration with Existing Email**
- User tries to register with email already in use
- Error displayed: "This email is already registered"
- User remains on registration page
- User can navigate to login page

**Scenario 6: Login with Wrong Password**
- User enters correct email, wrong password
- Error displayed: "Invalid email or password"
- User remains on login page
- User can retry or reset password

**Scenario 7: Access Protected Page Without Login**
- Unauthenticated user navigates to `/queries`
- Middleware detects no session
- User redirected to `/login?redirect=/queries`
- After successful login, user redirected back to `/queries`

**Scenario 8: Session Expiration**
- User logged in, access token expires (after 1 hour)
- User navigates to protected page
- Middleware detects expired session
- User redirected to `/login`
- User logs in again

**Scenario 9: Invalid Reset Token**
- User receives password reset email
- User waits > 1 hour
- User clicks link in email
- Page displays error: "This reset link is invalid or expired"
- User can request new reset link

**Scenario 10: Password Validation Errors**
- User tries to register with password < 6 characters
- Error displayed inline: "Password must be at least 6 characters"
- Submit button disabled until valid
- User corrects password and submits successfully

### 7.3 Edge Cases

**Scenario 11: Already Logged In User Navigates to Login Page**
- Authenticated user navigates to `/login`
- Middleware detects session
- User redirected to `/queries`
- (Or: Login page shows "Already logged in" message with link to dashboard)

**Scenario 12: Concurrent Login Sessions**
- User logs in on Browser A
- User logs in on Browser B
- Both sessions active (Supabase supports multiple sessions by default)
- Logout on one browser doesn't affect the other
- (Future enhancement: Option to revoke all other sessions on login)

**Scenario 13: Network Error During Login**
- User submits login form
- Network request fails
- Error displayed: "Unable to connect. Please check your connection."
- User can retry
- Form state preserved (email still filled)

---

## 8. ENVIRONMENT VARIABLES

### Required Variables (already present)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key

### Optional Variables
- `SITE_URL` - Base URL for email links (defaults to `http://127.0.0.1:3000`)

### Local Development (.env.local)
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SITE_URL=http://127.0.0.1:3000
```

### Production (.env.production)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SITE_URL=https://yourdomain.com
```

---

## 9. API CONTRACT SUMMARY

### Authentication Endpoints

| Method | Endpoint | Auth Required | Request Body | Success Response | Error Codes |
|--------|----------|---------------|--------------|------------------|-------------|
| POST | `/api/auth/register` | No | `{ email, password, confirmPassword }` | 201: `{ user }` | 400, 409, 500 |
| POST | `/api/auth/login` | No | `{ email, password }` | 200: `{ user }` | 400, 401, 500 |
| POST | `/api/auth/logout` | Yes | - | 204: (empty) | 401, 500 |
| GET | `/api/auth/me` | Yes | - | 200: `{ user }` | 401, 500 |
| POST | `/api/auth/forgot-password` | No | `{ email }` | 200: `{ message }` | 400, 429, 500 |
| POST | `/api/auth/reset-password` | No | `{ token, password, confirmPassword }` | 200: `{ message }` | 400, 500 |

### Protected Endpoints (Auth Required)
All existing endpoints (`/api/queries`, `/api/groups`, `/api/ai-clusters`, `/api/import`) now require authentication. Unauthorized requests return 401.


---

## CONCLUSION

This specification provides a complete authentication architecture that:
- ✅ Implements all requirements from US-000, US-001, US-002
- ✅ Integrates seamlessly with existing codebase
- ✅ Uses Supabase Auth for secure authentication
- ✅ Follows Astro 5 SSR best practices
- ✅ Maintains compatibility with all existing features
- ✅ Provides clear separation of concerns (UI, API, auth logic)
- ✅ Includes comprehensive testing scenarios
- ✅ Addresses security considerations

The implementation is ready to proceed following the checklist in section 4.








