import assert from "node:assert/strict";

const app = "http://localhost:3000";
const jaeger = "http://localhost:16686";
const grafana = "http://localhost:3001";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function json(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  return { response, body: await response.json() };
}
async function scenario(name, probability = 0) {
  const result = await json(`${app}/api/lab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: name, failureProbability: probability }),
  });
  const expected =
    name === "failed" || (name === "random" && probability === 1) ? 500 : 200;
  assert.equal(result.response.status, expected, `${name}: HTTP status`);
  assert.equal(result.body.httpStatus, expected);
  assert.match(
    result.body.traceId ?? "",
    /^[0-9a-f]{32}$/,
    `${name}: real active trace ID required`,
  );
  assert.equal(result.response.headers.get("x-trace-id"), result.body.traceId);
  assert.ok(result.body.timings.length > 0);
  console.log(
    `PASS ${name}: HTTP ${expected}, application ${result.body.serverDurationMs.toFixed(1)} ms, trace ${result.body.traceId}`,
  );
  return result.body;
}
async function waitForTrace(traceId) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const { response, body } = await json(`${jaeger}/api/traces/${traceId}`);
    if (response.ok && body.data?.[0]?.spans?.length) return body.data[0];
    await pause(500);
  }
  throw new Error(`Jaeger did not receive trace ${traceId} within 15 seconds`);
}

try {
  for (const route of ["/", "/orders", "/lab", "/learn", "/orders/ORD-1048"]) {
    const response = await fetch(`${app}${route}`, {
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, `${route} renders`);
    assert.doesNotMatch(
      await response.text(),
      /"digest":"\d+"/,
      `${route} has no streamed server error`,
    );
  }
  const health = await json("http://localhost:4000/health");
  assert.equal(health.body.service, "tracelab-backend");
  for (const name of [
    "fast",
    "slow",
    "failed",
    "random",
    "sequential",
    "parallel",
  ])
    await scenario(name);
  await scenario("random", 1);
  const nested = await scenario("nested");
  const external = await scenario("external");
  assert.equal(external.backendTraceId, external.traceId);
  const invalid = await json(`${app}/api/lab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: "random", failureProbability: 2 }),
  });
  assert.equal(invalid.response.status, 400);
  const trace = await waitForTrace(external.traceId);
  const services = new Set(
    Object.values(trace.processes).map((process) => process.serviceName),
  );
  assert.ok(
    services.has("tracelab-nextjs"),
    "Next.js service is in exported trace",
  );
  assert.ok(
    services.has("tracelab-backend"),
    "Backend service is in exported trace",
  );
  const caller = trace.spans.find(
    (span) => span.operationName === "backend /simulate",
  );
  const receiver = trace.spans.find(
    (span) =>
      span.operationName === "GET /simulate" &&
      trace.processes[span.processID].serviceName === "tracelab-backend",
  );
  assert.ok(caller && receiver, "CLIENT and SERVER spans exist");
  assert.ok(
    receiver.references.some(
      (ref) => ref.refType === "CHILD_OF" && ref.spanID === caller.spanID,
    ),
    "Backend SERVER parent is the outgoing Next.js CLIENT span",
  );
  console.log(
    "PASS Jaeger: both real services and correct cross-service parent IDs",
  );
  const nestedTrace = await waitForTrace(nested.traceId);
  for (const [childName, parentName] of [
    ["process-checkout", "lab.nested"],
    ["fetch-orders", "process-checkout"],
    ["simulate-database-query", "fetch-orders"],
    ["calculate-order-totals", "fetch-orders"],
  ]) {
    const child = nestedTrace.spans.find(
      (span) => span.operationName === childName,
    );
    const parent = nestedTrace.spans.find(
      (span) => span.operationName === parentName,
    );
    assert.ok(
      child &&
        parent &&
        child.references.some(
          (ref) => ref.refType === "CHILD_OF" && ref.spanID === parent.spanID,
        ),
      `${childName} has parent ${parentName}`,
    );
  }
  console.log("PASS Jaeger: nested span hierarchy");
  const proxy = await json(
    `${grafana}/api/datasources/proxy/uid/tracelab-jaeger/api/services`,
  );
  assert.equal(
    proxy.response.status,
    200,
    "Grafana can query its provisioned Jaeger data source",
  );
  assert.ok(proxy.body.data.includes("tracelab-nextjs"));
  assert.ok(proxy.body.data.includes("tracelab-backend"));
  console.log("PASS Grafana → Jaeger over the Compose network");
} catch (error) {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
}
