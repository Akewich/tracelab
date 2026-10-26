"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  Dices,
  FlaskConical,
  GitBranch,
  Layers,
  Loader2,
  Network,
  Play,
  RotateCw,
  Timer,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import {
  labResultSchema,
  type LabResult,
  type ScenarioId,
} from "@tracelab/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { TraceLink } from "@/components/trace-link";
import { copy } from "@/i18n/th";
import { cn } from "@/lib/utils";
import { Waterfall } from "./waterfall";

const scenarioIcons = {
  fast: Zap,
  slow: Timer,
  failed: CircleAlert,
  random: Dices,
  sequential: ArrowDownRight,
  parallel: Layers,
  nested: GitBranch,
  external: Network,
};
interface Run {
  result: LabResult;
  clientDurationMs: number;
  key: number;
}

export function Lab() {
  const [selected, setSelected] = useState<ScenarioId>("fast");
  const [probability, setProbability] = useState(35);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scenario =
    copy.scenarios.find((item) => item.id === selected) ?? copy.scenarios[0];
  const latest = runs.find((run) => run.result.scenario === selected);
  const Icon = scenarioIcons[selected];

  async function runScenario() {
    if (running) return;
    setRunning(true);
    setFailure(null);
    setCopied(false);
    const started = performance.now();
    try {
      const response = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: selected,
          failureProbability: probability / 100,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const parsed = labResultSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.httpStatus !== response.status) {
        setFailure(copy.labPage.invalid);
        return;
      }
      const run: Run = {
        result: parsed.data,
        clientDurationMs: performance.now() - started,
        key: Date.now(),
      };
      setRuns((previous) => [run, ...previous].slice(0, 24));
    } catch {
      setFailure(copy.labPage.transport);
    } finally {
      setRunning(false);
    }
  }

  async function copyTraceId() {
    if (!latest?.result.traceId) return;
    try {
      await navigator.clipboard.writeText(latest.result.traceId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={copy.labPage.eyebrow}
        title={copy.labPage.title}
        description={copy.labPage.description}
        action={
          <span className="outline-pill">
            <span className="status-dot" />
            {copy.labPage.badge}
          </span>
        }
      />
      <div className="request-flow">
        <span>
          <Workflow size={17} />
          {copy.labPage.noBrowser}
        </span>
        <small>{copy.labPage.boundary}</small>
      </div>
      <div className="lab-layout">
        <div className="experiments-column">
          <div className="section-heading">
            <h2>{copy.labPage.choose}</h2>
            <p>{copy.labPage.chooseDescription}</p>
          </div>
          <div className="scenario-grid">
            {copy.scenarios.map((item, index) => {
              const ScenarioIcon = scenarioIcons[item.id];
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={running}
                  onClick={() => {
                    setSelected(item.id);
                    setFailure(null);
                    setCopied(false);
                  }}
                  aria-pressed={selected === item.id}
                  className={cn(
                    "scenario-card",
                    selected === item.id && "selected",
                    (item.id === "failed" || item.id === "random") &&
                      "failure-scenario",
                  )}
                >
                  <div className="scenario-top">
                    <span className="scenario-icon">
                      <ScenarioIcon size={18} />
                    </span>
                    <span className="scenario-number">0{index + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="scenario-footer">
                    <code>{item.range}</code>
                    <ArrowUpRight size={15} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="experiment-column">
          <Card className="panel experiment-panel">
            <div className="panel-heading">
              <div className="experiment-title">
                <span className="scenario-icon large">
                  <Icon size={23} />
                </span>
                <div>
                  <span className="eyebrow">
                    {copy.labPage.experiment} · {scenario.category}
                  </span>
                  <h2>{scenario.title}</h2>
                </div>
              </div>
            </div>
            <p className="experiment-description">{scenario.description}</p>
            {selected === "random" && (
              <div className="probability-control">
                <label htmlFor="probability">
                  {copy.labPage.probability}
                  <strong>{probability}%</strong>
                </label>
                <input
                  id="probability"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={probability}
                  disabled={running}
                  onChange={(event) =>
                    setProbability(Number(event.target.value))
                  }
                />
                <small>{copy.labPage.probabilityHelp}</small>
              </div>
            )}
            <div className="experiment-actions">
              <Button
                onClick={() => {
                  void runScenario();
                }}
                disabled={running}
                className="run-button"
              >
                {running ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : latest ? (
                  <RotateCw size={16} />
                ) : (
                  <Play size={15} />
                )}{" "}
                {running
                  ? copy.labPage.running
                  : latest
                    ? copy.labPage.repeat
                    : copy.labPage.run}
              </Button>
              <TraceLink traceId={latest?.result.traceId} />
            </div>
            <div className="jaeger-tip">
              <span>
                <FlaskConical size={14} />
                {copy.labPage.look}
              </span>
              <p>{scenario.look}</p>
            </div>
          </Card>
          <Card
            className="panel result-panel"
            aria-live="polite"
            aria-busy={running}
          >
            <div className="panel-heading">
              <h2>{copy.labPage.response}</h2>
              {latest && !running && (
                <span
                  className={
                    latest.result.status === "success"
                      ? "health-good"
                      : "health-offline"
                  }
                >
                  {latest.result.status === "success" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}{" "}
                  {latest.result.status === "success"
                    ? copy.labPage.success
                    : copy.labPage.failed}
                </span>
              )}
            </div>
            {running ? (
              <div className="result-loading">
                <Loader2 className="animate-spin text-primary" size={27} />
                <p>{copy.labPage.running}</p>
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            ) : failure ? (
              <div role="alert" className="empty-state compact">
                <CircleAlert className="text-destructive" />
                <p>{failure}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void runScenario();
                  }}
                >
                  {copy.labPage.repeat}
                </Button>
              </div>
            ) : latest ? (
              <>
                <div className="result-metrics">
                  <div>
                    <span>
                      <Clock3 size={13} />
                      {copy.labPage.client}
                    </span>
                    <strong>
                      {latest.clientDurationMs.toFixed(1)}
                      <small>ms</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <Activity size={13} />
                      {copy.labPage.server}
                    </span>
                    <strong>
                      {latest.result.serverDurationMs.toFixed(1)}
                      <small>ms</small>
                    </strong>
                  </div>
                  <div>
                    <span>{copy.labPage.http}</span>
                    <strong
                      className={
                        latest.result.httpStatus >= 400
                          ? "text-destructive"
                          : "text-success"
                      }
                    >
                      {latest.result.httpStatus}
                    </strong>
                  </div>
                </div>
                <p className="duration-note">{copy.labPage.clientNote}</p>
                <div className="trace-id-block">
                  <label>{copy.labPage.trace}</label>
                  <div>
                    <code>
                      {latest.result.traceId ?? copy.labPage.unavailable}
                    </code>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={
                        copied ? copy.labPage.copied : copy.labPage.copy
                      }
                      disabled={!latest.result.traceId}
                      onClick={() => {
                        void copyTraceId();
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>
                {latest.result.backendTraceId &&
                  latest.result.backendTraceId === latest.result.traceId && (
                    <p className="propagation-confirmed">
                      <CheckCircle2 size={14} />
                      {copy.labPage.confirmed}
                    </p>
                  )}
                <p
                  className={cn(
                    "result-message",
                    latest.result.status === "error" && "text-destructive",
                  )}
                >
                  {latest.result.message}
                </p>
              </>
            ) : (
              <div className="result-empty">
                <div className="result-empty-icon">
                  <Activity size={27} />
                </div>
                <h3>{copy.labPage.ready}</h3>
                <p>{copy.labPage.readyDescription}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Waterfall timings={running ? [] : (latest?.result.timings ?? [])} />
      <section className="panel history-panel">
        <div className="panel-heading">
          <h2>{copy.labPage.history}</h2>
          <span className="count-badge">{runs.length}</span>
        </div>
        {runs.length ? (
          <div className="history-list">
            {runs.slice(0, 8).map((run) => (
              <button
                type="button"
                className="history-row"
                disabled={running}
                key={run.key}
                onClick={() => setSelected(run.result.scenario)}
              >
                <span
                  className={
                    run.result.status === "success"
                      ? "timing-dot"
                      : "timing-dot error"
                  }
                />
                <strong>
                  {
                    copy.scenarios.find(
                      (item) => item.id === run.result.scenario,
                    )?.title
                  }
                </strong>
                <code>{run.result.traceId?.slice(0, 16) ?? "—"}</code>
                <span>{run.clientDurationMs.toFixed(0)} ms</span>
                <span
                  className={
                    run.result.httpStatus >= 400
                      ? "text-destructive"
                      : "text-success"
                  }
                >
                  {run.result.httpStatus}
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <p className="history-empty">{copy.labPage.historyEmpty}</p>
        )}
      </section>
    </>
  );
}
