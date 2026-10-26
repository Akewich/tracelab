import { copy } from "@/i18n/th";
export default function Loading() {
  return (
    <div role="status" aria-label={copy.orders.loading}>
      <div className="skeleton heading-skeleton" />
      <div className="panel skeleton-panel">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton row-skeleton" />
        ))}
      </div>
      <span className="sr-only">{copy.orders.loading}</span>
    </div>
  );
}
