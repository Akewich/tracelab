import { getHealth } from "@/features/health/server/queries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    service: "tracelab-nextjs",
    services: await getHealth(),
  });
}
