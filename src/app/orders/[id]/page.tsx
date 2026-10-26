import { OrderDetail } from "@/features/orders/components/order-detail";
export const dynamic = "force-dynamic";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetail id={(await params).id} />;
}
