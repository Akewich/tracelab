import type { Metadata } from "next";
import { z } from "zod";
import { OrderList } from "@/features/orders/components/order-list";
export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
const filters = z.object({
  q: z.string().max(120).catch(""),
  status: z
    .enum(["all", "completed", "processing", "pending", "cancelled"])
    .catch("all"),
});
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, status } = filters.parse(await searchParams);
  return <OrderList query={q} status={status} />;
}
