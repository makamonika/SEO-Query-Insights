import type { ErrorResponse } from "@/types";

type AuthenticatedUser = NonNullable<App.Locals["user"]>;

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function requireUser(locals: App.Locals): AuthenticatedUser {
  if (!locals.user) {
    throw new UnauthorizedError();
  }

  return locals.user;
}

export function buildUnauthorizedResponse(message = "Authentication required"): Response {
  const errorResponse: ErrorResponse = {
    error: {
      code: "unauthorized",
      message,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
