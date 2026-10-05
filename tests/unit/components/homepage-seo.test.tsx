import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "loading" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth-button", () => ({ AuthButton: () => <button>Sign in</button> }));
vi.mock("@/components/product-demo", () => ({ ProductDemo: () => <div>Product demo</div> }));

import HomePage from "@/app/(public)/page";

describe("homepage crawler rendering", () => {
  it("includes the product and features in server HTML while the session is loading", () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(<HomePage />),
      "text/html",
    );
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("#features")?.textContent).toContain("CSV Personalization");
    expect(document.querySelector("#how-it-works")?.textContent).toContain("Connect Gmail");
  });
});
