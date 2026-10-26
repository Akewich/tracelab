import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { getOrders } from "../server/queries";
import { money, OrderStatus } from "./orders-table";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { TraceLink } from "@/components/trace-link";
import { copy } from "@/i18n/th";

export async function OrderDetail({ id }: { id: string }) {
  const data = await getOrders();
  const order = data.orders.find((item) => item.id === id);
  if (!order) notFound();
  return (
    <>
      <Link href="/orders" className="back-link">
        <ArrowLeft size={15} />
        {copy.orders.back}
      </Link>
      <PageHeading
        eyebrow={copy.orders.eyebrow}
        title={order.id}
        description={copy.orders.detailDescription}
        action={<OrderStatus status={order.status} />}
      />
      <div className="detail-grid">
        <Card className="panel">
          <div className="panel-heading">
            <h2>{copy.orders.detailTitle}</h2>
            <Package className="text-primary" size={20} />
          </div>
          <dl className="detail-list">
            {[
              [copy.orders.customer, order.customer],
              [copy.orders.product, order.product],
              [copy.orders.quantity, order.quantity],
              [
                copy.orders.date,
                new Date(order.date).toLocaleString("en-US", {
                  timeZone: "UTC",
                }) + " UTC",
              ],
              [copy.orders.payment, order.payment],
              [copy.orders.total, money(order.total)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="info-note">
            <ShieldCheck size={17} />
            {copy.orders.demo}
          </div>
        </Card>
        <Card className="panel">
          <div className="panel-heading">
            <h2>{copy.orders.request}</h2>
          </div>
          <div className="detail-trace">
            <code>{data.traceId ?? copy.orders.unavailable}</code>
            <p>
              {data.durationMs.toFixed(1)} ms · {copy.dashboard.latencyNote}
            </p>
            <TraceLink traceId={data.traceId} label={copy.orders.inspect} />
          </div>
        </Card>
      </div>
    </>
  );
}
