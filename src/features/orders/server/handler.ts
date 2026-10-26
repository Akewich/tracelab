import { getOrders } from "./queries";
export async function handleOrders() {
  try {
    const data = await getOrders();
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
        ...(data.traceId ? { "X-Trace-Id": data.traceId } : {}),
      },
    });
  } catch {
    return Response.json(
      { error: "Orders service unavailable. Start the backend and retry." },
      { status: 502 },
    );
  }
}
