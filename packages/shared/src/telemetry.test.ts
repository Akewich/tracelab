import { expect, it } from "vitest";
import { activeTraceId, Recorder } from "./telemetry.ts";

it("never fabricates trace IDs when no provider is registered", async () => {
  expect(activeTraceId()).toBeNull();
  const recorder = new Recorder();
  await recorder.run("without-sdk", async () => {
    expect(activeTraceId()).toBeNull();
  });
  expect(recorder.timings).toHaveLength(1);
  expect(recorder.timings[0]?.durationMs).toBeGreaterThanOrEqual(0);
});
