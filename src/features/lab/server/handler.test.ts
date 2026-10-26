import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { handleScenario } from "./handler";

it("returns HTTP 400 for malformed JSON and out-of-range probability", async () => {
  for (const body of [
    "{broken",
    JSON.stringify({ scenario: "random", failureProbability: 2 }),
  ]) {
    const response = await handleScenario(
      new Request("http://localhost/api/lab", { method: "POST", body }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.has("x-trace-id")).toBe(false);
  }
});

it("returns an actual HTTP 500 with server timing and an honest unavailable trace ID without an SDK", async () => {
  const response = await handleScenario(
    new Request("http://localhost/api/lab", {
      method: "POST",
      body: JSON.stringify({ scenario: "failed" }),
    }),
  );
  expect(response.status).toBe(500);
  expect(response.headers.get("server-timing")).toMatch(/^application;dur=\d+/);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body.httpStatus).toBe(500);
  expect(body.traceId).toBeNull();
  expect(response.headers.has("x-trace-id")).toBe(false);
});
