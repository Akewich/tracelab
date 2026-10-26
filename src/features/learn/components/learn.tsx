import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  Globe,
  Layers,
  Server,
  Terminal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { copy } from "@/i18n/th";

const icons = [Globe, Layers, Server, Database];
export function Learn() {
  return (
    <>
      <PageHeading
        eyebrow={copy.learn.eyebrow}
        title={copy.learn.title}
        description={copy.learn.description}
        action={
          <Link href="/lab" className="button-link primary-link">
            {copy.learn.tryIt}
            <ArrowRight size={15} />
          </Link>
        }
      />
      <Card className="panel learn-intro">
        <div className="panel-heading">
          <div>
            <h2>
              <BookOpen size={19} />
              {copy.learn.introTitle}
            </h2>
            <p>{copy.learn.intro}</p>
          </div>
        </div>
        <div className="architecture-diagram">
          {copy.learn.diagram.map((label, index) => {
            const Icon = icons[index] ?? Server;
            return (
              <div key={label} className="architecture-step">
                <div className="architecture-node">
                  <span>
                    <Icon size={23} />
                  </span>
                  <strong>{label}</strong>
                  <small>
                    {index === 1
                      ? "tracelab-nextjs"
                      : index === 2
                        ? "tracelab-backend"
                        : index === 0
                          ? "performance.now()"
                          : "sleep()"}
                  </small>
                </div>
                {index < 3 && (
                  <ArrowRight className="architecture-arrow" size={20} />
                )}
              </div>
            );
          })}
        </div>
        <p className="diagram-note">{copy.learn.diagramNote}</p>
        <div className="reality-labels">
          <span>
            <CheckCircle2 size={15} />
            {copy.learn.real}
          </span>
          <span>
            <Terminal size={15} />
            {copy.learn.simulated}
          </span>
        </div>
      </Card>
      <div className="learn-topics">
        {copy.learn.topics.map((topic, index) => (
          <Card className="panel topic-card" key={topic.title}>
            <span className="topic-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2>{topic.title}</h2>
            <p>{topic.text}</p>
          </Card>
        ))}
      </div>
      <div className="code-grid">
        <Card className="panel code-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <Code2 size={18} />
                {copy.learn.code}
              </h2>
              <p>{copy.learn.codeDescription}</p>
            </div>
          </div>
          <pre>
            <code>{copy.learn.spanCode}</code>
          </pre>
        </Card>
        <Card className="panel code-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <Code2 size={18} />
                {copy.learn.topics[4].title}
              </h2>
              <p>{copy.learn.diagramNote}</p>
            </div>
          </div>
          <pre>
            <code>{copy.learn.propagationCode}</code>
          </pre>
        </Card>
      </div>
      <div className="next-step">
        <span className="mini-icon">
          <BookOpen size={17} />
        </span>
        <p>
          <strong>{copy.dashboard.nextStep}</strong>
          {copy.dashboard.nextText}
        </p>
        <Link href="/lab">
          {copy.learn.tryIt}
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
