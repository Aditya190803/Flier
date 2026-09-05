import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, vi, type VitestUtils } from "vite-plus/test";

if (
  typeof (vi as { stubEnv?: (key: string, value: string) => void }).stubEnv ===
  "function"
) {
  vi.stubEnv("NODE_ENV", "test");
} else {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    configurable: true,
    writable: true,
  });
}
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret";
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??= "https://localhost/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??= "test-project-id";
process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ??= "test-database-id";
process.env.APPWRITE_API_KEY ??= "test-appwrite-api-key";

if (typeof window === "undefined" || typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  });
}

// Create simple mock storage implementations
const createMockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

const mockLocalStorage = createMockStorage();
const mockSessionStorage = createMockStorage();

// Hold storage on a plain object — do NOT proxy globalThis <-> window.
// In jsdom, globalThis === window, so get: () => window.localStorage recurses.
const storageHolders: Record<
  string,
  Storage | ReturnType<typeof createMockStorage>
> = {
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
};

for (const storageKey of ["localStorage", "sessionStorage"] as const) {
  const descriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: true,
    get: () => storageHolders[storageKey],
    set: (value) => {
      storageHolders[storageKey] = value;
    },
  };
  Object.defineProperty(globalThis, storageKey, descriptor);
  const win = (globalThis as { window?: Window & typeof globalThis }).window;
  // Only mirror when window is a separate object (node); jsdom shares identity.
  if (win && (win as object) !== (globalThis as object)) {
    Object.defineProperty(win, storageKey, descriptor);
  }
}

type VitestCompat = typeof vi & {
  mocked?: <T>(item: T) => T;
  hoisted?: <T>(factory: () => T) => T;
  useFakeTimers?: () => VitestUtils;
  useRealTimers?: () => VitestUtils;
  setSystemTime?: (time: number | string | Date) => VitestUtils;
  advanceTimersByTime?: (ms: number) => VitestUtils;
  resetModules?: () => VitestUtils;
};

const viCompat = vi as VitestCompat;
const RealDate = Date;
const realDateNow = RealDate.now.bind(RealDate);
let mockedNow = realDateNow();
let fakeTimersEnabled = false;

viCompat.mocked ??= ((item: unknown) => item) as any;
viCompat.hoisted ??= <T>(factory: () => T) => factory();
viCompat.useFakeTimers ??= () => {
  if (!fakeTimersEnabled) {
    mockedNow = realDateNow();
  }

  class MockDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockedNow);
        return;
      }

      if (args.length === 1) {
        super(args[0]);
        return;
      }

      if (args.length === 2) {
        super(args[0], args[1]);
        return;
      }

      if (args.length === 3) {
        super(args[0], args[1], args[2]);
        return;
      }

      if (args.length === 4) {
        super(args[0], args[1], args[2], args[3]);
        return;
      }

      if (args.length === 5) {
        super(args[0], args[1], args[2], args[3], args[4]);
        return;
      }

      if (args.length === 6) {
        super(args[0], args[1], args[2], args[3], args[4], args[5]);
        return;
      }

      super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    }

    static override now() {
      return mockedNow;
    }
  }

  fakeTimersEnabled = true;
  globalThis.Date = MockDate as DateConstructor;
  return viCompat as VitestUtils;
};
viCompat.setSystemTime ??= (time: number | string | Date) => {
  mockedNow = new RealDate(time).getTime();
  viCompat.useFakeTimers?.();
  return viCompat as VitestUtils;
};
viCompat.advanceTimersByTime ??= (ms: number) => {
  mockedNow += ms;
  return viCompat as VitestUtils;
};
viCompat.useRealTimers ??= () => {
  fakeTimersEnabled = false;
  globalThis.Date = RealDate;
  return viCompat as VitestUtils;
};
viCompat.resetModules ??= () => viCompat as VitestUtils;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        email: "test@example.com",
        name: "Test User",
      },
      accessToken: "mock-token",
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  mockLocalStorage.clear();
  mockSessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  viCompat.useRealTimers?.();
  (vi as any).doUnmock?.("@/lib/logger");
  (vi as any).doUnmock?.("@/lib/auth");
  (vi as any).resetModules?.();
});
