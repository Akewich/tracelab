import { ArrowUpRight } from "lucide-react";
import { copy } from "@/i18n/th";
export function TraceLink({
  traceId,
  label = copy.jaeger,
}: {
  traceId?: string | null;
  label?: string;
}) {
  return (
    <a
      className="button-link"
      href={
        traceId
          ? `http://localhost:16686/trace/${traceId}`
          : "http://localhost:16686/search?service=tracelab-nextjs"
      }
      target="_blank"
      rel="noreferrer"
    >
      {label}
      <ArrowUpRight size={15} />
    </a>
  );
}
