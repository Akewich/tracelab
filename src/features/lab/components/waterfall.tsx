import { GitBranch } from "lucide-react";
import type { Timing } from "@tracelab/shared";
import { copy } from "@/i18n/th";

function depthOf(row: Timing, rows: Timing[]): number {
  if (!row.parentId) return 0;
  const parent = rows.find((candidate) => candidate.id === row.parentId);
  return parent ? 1 + depthOf(parent, rows) : 0;
}

export function Waterfall({ timings }: { timings: Timing[] }) {
  const total = Math.max(
    1,
    ...timings.map((row) => row.startMs + row.durationMs),
  );
  return (
    <section className="panel waterfall-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <GitBranch size={17} />
            {copy.labPage.waterfall}
          </h2>
          <p>{copy.labPage.waterfallNote}</p>
        </div>
      </div>
      {timings.length ? (
        <div className="waterfall-scroll">
          <div className="waterfall-header">
            <span>{copy.labPage.operation}</span>
            <div>
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <span key={fraction}>{Math.round(fraction * total)} ms</span>
              ))}
            </div>
            <span>{copy.labPage.duration}</span>
          </div>
          {timings.map((row) => (
            <div className="waterfall-row" key={row.id}>
              <div
                className="waterfall-operation"
                style={{ paddingLeft: 18 + depthOf(row, timings) * 15 }}
              >
                <span
                  className={
                    row.status === "error" ? "timing-dot error" : "timing-dot"
                  }
                />
                <span title={row.operation}>
                  {row.parentId && <span className="tree-elbow">└ </span>}
                  {row.operation}
                </span>
              </div>
              <div className="waterfall-track">
                <div
                  className={`waterfall-bar ${row.status === "error" ? "error" : ""} depth-${Math.min(depthOf(row, timings), 3)}`}
                  style={{
                    left: `${(row.startMs / total) * 100}%`,
                    width: `${Math.max(0.5, (row.durationMs / total) * 100)}%`,
                  }}
                  title={`${copy.labPage.offset}: ${row.startMs.toFixed(1)} ms · ${row.status}`}
                />
              </div>
              <span className="waterfall-duration">
                {row.durationMs.toFixed(1)} ms
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-waterfall">
          <div className="empty-trace-art">
            <span />
            <span />
            <span />
          </div>
          <p>{copy.labPage.emptyWaterfall}</p>
        </div>
      )}
    </section>
  );
}
