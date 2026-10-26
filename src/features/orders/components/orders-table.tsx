import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { copy } from "@/i18n/th";
import { Badge } from "@/components/ui/badge";
import type { Order } from "../contracts";

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export function OrderStatus({ status }: { status: Order["status"] }) {
  return (
    <Badge variant="outline" className={`order-status status-${status}`}>
      <span />
      {copy.orders[status]}
    </Badge>
  );
}
export function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="table-scroll">
      <table className="orders-table">
        <thead>
          <tr>
            <th>{copy.orders.id}</th>
            <th>{copy.orders.customer}</th>
            <th>{copy.orders.product}</th>
            <th>{copy.orders.status}</th>
            <th>{copy.orders.amount}</th>
            <th>
              <span className="sr-only">{copy.orders.details}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link href={`/orders/${order.id}`} className="order-id">
                  #{order.id.replace("ORD-", "")}
                </Link>
                <small>
                  {new Date(order.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </small>
              </td>
              <td>
                <div className="customer-cell">
                  <span className="customer-avatar">{order.initials}</span>
                  <span>
                    {order.customer}
                    <small>{copy.orders.demo}</small>
                  </span>
                </div>
              </td>
              <td>
                <span className="product-cell">
                  <Package size={15} />
                  {order.product}
                </span>
              </td>
              <td>
                <OrderStatus status={order.status} />
              </td>
              <td className="money-cell">{money(order.total)}</td>
              <td>
                <Link
                  className="row-link"
                  href={`/orders/${order.id}`}
                  aria-label={`${copy.orders.details} ${order.id}`}
                >
                  <ArrowUpRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="empty-state compact">
          <Package />
          <p>{copy.orders.empty}</p>
          <Link href="/orders">{copy.orders.reset}</Link>
        </div>
      )}
    </div>
  );
}
