import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

type ResponseEntry = Record<string, unknown> | (() => Record<string, unknown>);

export interface PostgrestQueryBuilderMockOptions {
  thenResponses?: ResponseEntry[];
  singleResponses?: ResponseEntry[];
  maybeSingleResponses?: ResponseEntry[];
}

type PostgrestQueryBuilderMockInternal = Record<string, ReturnType<typeof vi.fn>> & {
  then: (
    onFulfilled?: (value: Record<string, unknown>) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>;
  single: () => Promise<Record<string, unknown>>;
  maybeSingle: () => Promise<Record<string, unknown>>;
  __queueThen: (response: ResponseEntry) => PostgrestQueryBuilderMockInternal;
  __queueSingle: (response: ResponseEntry) => PostgrestQueryBuilderMockInternal;
  __queueMaybeSingle: (response: ResponseEntry) => PostgrestQueryBuilderMockInternal;
};

const DEFAULT_QUERY_RESPONSE = Object.freeze({
  data: null,
  error: null,
  count: null,
});

function cloneDefault(value?: Record<string, unknown>): Record<string, unknown> {
  if (value !== undefined) {
    return value;
  }
  return { ...DEFAULT_QUERY_RESPONSE };
}

export function createPostgrestQueryBuilderMock(
  options: PostgrestQueryBuilderMockOptions = {}
): PostgrestQueryBuilderMockInternal {
  const thenQueue = [...(options.thenResponses ?? [])];
  const singleQueue = [...(options.singleResponses ?? [])];
  const maybeSingleQueue = [...(options.maybeSingleResponses ?? [])];

  const builder: Partial<PostgrestQueryBuilderMockInternal> = {};

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "ilike",
    "in",
    "order",
    "range",
    "limit",
    "rangeStart",
    "rangeEnd",
  ];

  chainMethods.forEach((method) => {
    builder[method] = vi.fn(() => builder as PostgrestQueryBuilderMockInternal);
  });

  const dequeue = (queue: ResponseEntry[], defaultValue?: Record<string, unknown>): Record<string, unknown> => {
    const next = queue.shift();
    if (next !== undefined) {
      return typeof next === "function" ? (next as () => Record<string, unknown>)() : next;
    }
    return cloneDefault(defaultValue);
  };

  builder.then = vi.fn(
    (onFulfilled?: (value: Record<string, unknown>) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(dequeue(thenQueue)).then(onFulfilled, onRejected)
  );

  builder.single = vi.fn(() => Promise.resolve(dequeue(singleQueue)));

  builder.maybeSingle = vi.fn(() => Promise.resolve(dequeue(maybeSingleQueue)));

  builder.__queueThen = (response: ResponseEntry) => {
    thenQueue.push(response);
    return builder as PostgrestQueryBuilderMockInternal;
  };

  builder.__queueSingle = (response: ResponseEntry) => {
    singleQueue.push(response);
    return builder as PostgrestQueryBuilderMockInternal;
  };

  builder.__queueMaybeSingle = (response: ResponseEntry) => {
    maybeSingleQueue.push(response);
    return builder as PostgrestQueryBuilderMockInternal;
  };

  return builder as PostgrestQueryBuilderMockInternal;
}

export function createSupabaseClientMock(): SupabaseClient<Database> {
  const supabase = {
    from: vi.fn(),
  };

  return supabase as unknown as SupabaseClient<Database>;
}

export type PostgrestQueryBuilderMock = ReturnType<typeof createPostgrestQueryBuilderMock>;
