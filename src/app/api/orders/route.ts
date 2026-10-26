import { handleOrders } from "@/features/orders/server/handler";
export const runtime = "nodejs";
export const GET = handleOrders;
