import Link from "next/link";
import { Search, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TraceLink } from "@/components/trace-link";
import { Retry } from "@/components/retry";
import { copy } from "@/i18n/th";
import { getOrders } from "../server/queries";
import { OrdersTable } from "./orders-table";

export async function OrderList({
  query,
  status,
}: {
  query: string;
  status: string;
}) {
  let data: Awaited<ReturnType<typeof getOrders>> | null = null;
  try {
    data = await getOrders();
  } catch {
    /* Render the recoverable service error. */
  }
  const filtered =
    data?.orders.filter(
      (order) =>
        (status === "all" || order.status === status) &&
        `${order.id} ${order.customer} ${order.product}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <>
      <PageHeading
        eyebrow={copy.orders.eyebrow}
        title={copy.orders.title}
        description={copy.orders.description}
        action={<TraceLink traceId={data?.traceId} />}
      />
      <Card className="panel orders-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {copy.orders.title}
              <span className="count-badge">{data?.orders.length ?? "—"}</span>
            </h2>
            <p>{copy.dashboard.fixtures}</p>
          </div>
          <span className="subtle-chip">{copy.dashboard.mock}</span>
        </div>
        <form className="filter-bar" action="/orders">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label={copy.orders.searchLabel}
              name="q"
              defaultValue={query}
              placeholder={copy.orders.search}
            />
          </div>
          <div className="select-field">
            <SlidersHorizontal size={15} />
            <select
              aria-label={copy.orders.filter}
              name="status"
              defaultValue={status}
            >
              <option value="all">{copy.orders.all}</option>
              {(
                ["completed", "processing", "pending", "cancelled"] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {copy.orders[s]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline">
            {copy.orders.submit}
          </Button>
          {(query || status !== "all") && (
            <Link className="muted-link" href="/orders">
              {copy.orders.reset}
            </Link>
          )}
        </form>
        {data ? (
          <OrdersTable orders={filtered} />
        ) : (
          <div role="alert" className="empty-state">
            <AlertTriangle className="text-warning" size={30} />
            <h2>{copy.orders.error}</h2>
            <p>{copy.orders.errorDescription}</p>
            <Retry />
          </div>
        )}
        <div className="table-footer">
          <span>
            {filtered.length} {copy.orders.count}
          </span>
          <span className="trace-caption">
            {data?.traceId ?? copy.orders.unavailable}
          </span>
        </div>
      </Card>
    </>
  );
}
