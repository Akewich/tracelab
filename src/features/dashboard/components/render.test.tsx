import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { orders } from "@tracelab/shared/fixtures";
import { Dashboard } from "./dashboard";
import { Lab } from "@/features/lab/components/lab";
import { Learn } from "@/features/learn/components/learn";

vi.mock("@/features/orders/server/queries", () => ({
  getOrders: async () => ({ orders, traceId: null, durationMs: 75 }),
}));
vi.mock("@/features/health/server/queries", () => ({
  getHealth: async () => [
    { name: "Backend API", healthy: false, durationMs: null },
  ],
}));

it("renders the dashboard with demo commerce data and honest service health", async () => {
  const html = renderToString(await Dashboard());
  expect(html).toContain("A little commerce.");
  expect(html).toContain("Alex Morgan");
  expect(html).toContain("Unavailable");
  expect(html).toContain("Latest BFF");
});

it("renders the lab's initial state and explains its measurement boundary", () => {
  const html = renderToString(<Lab />);
  expect(html).toContain("Ready when you are");
  expect(html).toContain("No browser OpenTelemetry SDK is installed");
  expect(html).toContain("Local educational representation");
  expect((html.match(/aria-pressed=/g) ?? []).length).toBe(8);
});

it("renders all learning topics and real-versus-simulated explanations", () => {
  const html = renderToString(<Learn />);
  expect(html).toContain("W3C traceparent");
  expect(html).toContain("Browser vs server instrumentation");
  expect(html).toContain("SIMULATED:");
});
