import { sdk } from "./telemetry.ts";
import { createBackendServer } from "./server.ts";

const server = createBackendServer();
server.listen(4000, () =>
  console.log("TraceLab backend: http://localhost:4000"),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  await sdk.shutdown();
}
process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
