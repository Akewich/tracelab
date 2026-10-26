import type { Order } from "@tracelab/shared";
import { copy } from "@/i18n/th";

export function RevenueChart({ orders }: { orders: Order[] }) {
  const days = [20, 21, 22, 23, 24, 25, 26];
  const values = days.map((day) =>
    orders
      .filter(
        (order) =>
          order.status === "completed" &&
          new Date(order.date).getUTCDate() === day,
      )
      .reduce((sum, order) => sum + order.total, 0),
  );
  const max = Math.max(...values, 100);
  const coords = values.map(
    (value, i) => `${56 + i * 98},${180 - (value / max) * 140}`,
  );
  const line = "M " + coords.join(" L ");
  return (
    <div className="revenue-chart">
      <svg
        viewBox="0 0 700 228"
        role="img"
        aria-label={copy.dashboard.revenueSubtitle}
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity=".25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="56"
              x2="644"
              y1={40 + i * 47}
              y2={40 + i * 47}
              stroke="var(--border)"
              strokeDasharray="3 6"
            />
            <text
              x="0"
              y={44 + i * 47}
              fill="var(--muted-foreground)"
              fontSize="10"
            >
              ${Math.round(max * (1 - i / 3))}
            </text>
          </g>
        ))}
        <path d={`${line} L 644,182 L 56,182 Z`} fill="url(#revenue-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {values.map((value, i) => (
          <g key={i}>
            <circle
              cx={56 + i * 98}
              cy={180 - (value / max) * 140}
              r="4"
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth="2"
            >
              <title>{`Oct ${days[i]}: $${value}`}</title>
            </circle>
            <text
              x={56 + i * 98}
              y="216"
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="10"
            >
              Oct {days[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
