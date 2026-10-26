import "server-only";

export async function getHealth() {
  const services = [
    {
      name: "Backend API",
      url: `${process.env.BACKEND_URL ?? "http://localhost:4000"}/health`,
    },
    { name: "Jaeger", url: "http://localhost:16686/api/services" },
    { name: "Grafana", url: "http://localhost:3001/api/health" },
  ];
  return Promise.all(
    services.map(async ({ name, url }) => {
      const started = performance.now();
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(1200),
        });
        return {
          name,
          healthy: response.ok,
          durationMs: Math.round(performance.now() - started),
        };
      } catch {
        return { name, healthy: false, durationMs: null };
      }
    }),
  );
}
