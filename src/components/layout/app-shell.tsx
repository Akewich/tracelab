"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  Package,
  Radio,
  Terminal,
  Workflow,
} from "lucide-react";
import { copy } from "@/i18n/th";
import { cn } from "@/lib/utils";

const icons = [LayoutDashboard, Package, FlaskConical, BookOpen];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = copy.nav.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" aria-label={copy.brand} className="brand">
          <span className="brand-mark">
            <Workflow size={24} />
          </span>
          <span>
            {copy.brand}
            <small>{copy.tagline}</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">
            <Boxes size={18} />
          </span>
          <span>
            {copy.workspace}
            <small>
              <span className="status-dot" />
              {copy.local}
            </small>
          </span>
          <span className="workspace-shortcut">{copy.demo}</span>
        </div>
        <div className="nav-caption">{copy.workspace}</div>
        <nav aria-label={copy.workspace} className="main-nav">
          {copy.nav.map((item, index) => {
            const Icon = icons[index] ?? Activity;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn("nav-item", active && "active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.href === "/lab" && <span className="nav-count">8</span>}
              </Link>
            );
          })}
        </nav>
        <div className="nav-caption toolkit-caption">{copy.tools}</div>
        <a
          className="nav-item external-nav"
          href="http://localhost:16686"
          target="_blank"
          rel="noreferrer"
        >
          <Radio size={18} />
          {copy.jaeger}
          <ArrowUpRight size={14} />
        </a>
        <a
          className="nav-item external-nav"
          href="http://localhost:3001/explore"
          target="_blank"
          rel="noreferrer"
        >
          <Activity size={18} />
          {copy.grafana}
          <ArrowUpRight size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <span className="mini-icon">
              <Terminal size={17} />
            </span>
            <strong>{copy.system}</strong>
            <p>{copy.systemDescription}</p>
            <Link href="/learn">
              {copy.docs} <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="environment">
            <span className="status-dot" />
            {copy.environment}
            <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{copy.brand}</span>
            <span>/</span>
            <strong>{current?.label ?? copy.orders.detailTitle}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span className="status-dot" />
              {copy.local}
            </span>
            <span className="avatar">TL</span>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <Workflow size={14} />
            {copy.brand}
          </span>
          <span>{copy.tagline} · OpenTelemetry</span>
          <span>{copy.environment}</span>
        </footer>
      </div>
    </div>
  );
}
