import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  DollarSign,
  FlaskConical,
  Layers,
  Package,
  Radio,
  Users,
} from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Retry } from "@/components/retry";
import { copy } from "@/i18n/th";
import { getOrders } from "@/features/orders/server/queries";
import { getHealth } from "@/features/health/server/queries";
import { money, OrdersTable } from "@/features/orders/components/orders-table";
import { RevenueChart } from "./revenue-chart";

export async function Dashboard() {
  const [result, health] = await Promise.all([
    getOrders().catch(() => null),
    getHealth(),
  ]);
  const orders = result?.orders ?? [];
  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);
  const metrics = [
    {
      label: copy.dashboard.total,
      value: result ? String(orders.length) : "—",
      note: copy.dashboard.fixtures,
      icon: Package,
      trend: "12 demo orders",
    },
    {
      label: copy.dashboard.revenue,
      value: result ? money(revenue) : "—",
      note: copy.dashboard.paid,
      icon: DollarSign,
      trend: "USD",
    },
    {
      label: copy.dashboard.customers,
      value: result ? String(new Set(orders.map((o) => o.customer)).size) : "—",
      note: copy.dashboard.unique,
      icon: Users,
      trend: "Demo dataset",
    },
    {
      label: copy.dashboard.latency,
      value: result ? `${Math.round(result.durationMs)}` : "—",
      note: result ? copy.dashboard.latencyNote : copy.dashboard.noSample,
      icon: Clock3,
      trend: "ms · 1 sample",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={copy.dashboard.eyebrow}
        title={copy.dashboard.title}
        description={copy.dashboard.description}
        action={
          <Link href="/lab" className="button-link primary-link">
            <FlaskConical size={16} />
            {copy.lab}
            <ArrowUpRight size={15} />
          </Link>
        }
      />
      <div className="overview-label">
        <span className="subtle-chip">
          <Layers size={13} />
          {copy.dashboard.mock}
        </span>
        <span>
          <span className="status-dot" />
          {copy.dashboard.live}
        </span>
      </div>
      <div className="metric-grid">
        {metrics.map(({ label, value, note, icon: Icon, trend }) => (
          <Card key={label} className="metric-card">
            <div className="metric-top">
              <span>{label}</span>
              <span className="metric-icon">
                <Icon size={17} />
              </span>
            </div>
            <div className="metric-value">
              {value}
              {label === copy.dashboard.latency && result && <small>ms</small>}
            </div>
            <div className="metric-bottom">
              <span>{note}</span>
              <small>{trend}</small>
            </div>
          </Card>
        ))}
      </div>
      <div className="overview-middle">
        <Card className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>{copy.dashboard.revenueTitle}</h2>
              <p>{copy.dashboard.revenueSubtitle}</p>
            </div>
            <span className="period-chip">{copy.dashboard.period}</span>
          </div>
          <div className="revenue-total">
            {result ? money(revenue) : "—"}
            <span>
              <span className="legend-dot" />
              {copy.dashboard.revenue}
            </span>
          </div>
          <RevenueChart orders={orders} />
        </Card>
        <Card className="panel health-panel">
          <div className="panel-heading">
            <div>
              <h2>{copy.dashboard.healthTitle}</h2>
              <p>{copy.dashboard.healthSubtitle}</p>
            </div>
            <Radio size={18} className="text-primary" />
          </div>
          <div className="health-services">
            {health.map((service) => (
              <div key={service.name} className="health-service">
                <span className="service-icon">
                  <Activity size={16} />
                </span>
                <div>
                  <strong>{service.name}</strong>
                  <small>
                    {service.durationMs === null
                      ? "—"
                      : `${service.durationMs} ms`}
                  </small>
                </div>
                <span
                  className={service.healthy ? "health-good" : "health-offline"}
                >
                  <span className="status-dot" />
                  {service.healthy
                    ? copy.dashboard.healthy
                    : copy.dashboard.offline}
                </span>
              </div>
            ))}
          </div>
          <p className="health-note">{copy.dashboard.healthNote}</p>
        </Card>
      </div>
      <Link href="/lab" className="lab-banner">
        <span className="banner-illustration">
          <FlaskConical size={32} />
        </span>
        <div>
          <span className="eyebrow">{copy.dashboard.labBadge}</span>
          <h2>{copy.dashboard.labTitle}</h2>
          <p>{copy.dashboard.labDescription}</p>
        </div>
        <span className="banner-arrow">
          <ArrowRight size={22} />
        </span>
      </Link>
      <Card className="panel">
        <div className="panel-heading">
          <div>
            <h2>{copy.dashboard.recent}</h2>
            <p>{copy.dashboard.recentSubtitle}</p>
          </div>
          <Link href="/orders" className="text-link">
            {copy.dashboard.viewAll}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        {result ? (
          <OrdersTable orders={orders.slice(0, 5)} />
        ) : (
          <div role="alert" className="empty-state compact">
            <p>{copy.dashboard.backendOffline}</p>
            <Retry />
          </div>
        )}
      </Card>
      <div className="next-step">
        <span className="mini-icon">
          <FlaskConical size={16} />
        </span>
        <p>
          <strong>{copy.dashboard.nextStep}</strong>
          {copy.dashboard.nextText}
        </p>
        <Link href="/lab">
          {copy.lab}
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
