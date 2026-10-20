'use client';

// =====================================================================
// Dashboard — one summary of every Assurance Events page: a count and the
// first few rows of each page's list. Every widget makes the same request
// as its page and reuses that page's React Query key, so the two share a cache.
// =====================================================================

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  CARD, CARD_HEADER, CARD_TITLE, CARD_SUBTITLE, PAGE, PAGE_INNER_FLUSH, PageHeader, Spinner, StatCard, cx,
} from '@/components/assurance-events/ui';
import { SeverityBadge, StateBadge } from '@/components/assurance-events/definition-editor/fields';
import { formatRelative } from '@/lib/assurance-format';
import { resolveTenantIdForHeader } from '@/lib/auth';
import { assuranceRequest } from '@/lib/assurance-auth';
import { CcEvents, subjectLabel } from '@/lib/cc-events-api';
import { CcDefinitionWrites } from '@/lib/cc-definitions-api';
import { Controls } from '@/lib/controls-api';
import { ReviewForms } from '@/lib/assurance-review-forms';
import { SlaProfiles, humanDuration } from '@/lib/cc-sla-profiles-api';
import { Actions } from '@/lib/cc-actions-api';
import { Executors } from '@/lib/assurance-executors';
import { listEmailTemplates } from '@/lib/assurance-notification-bindings';

const PREVIEW_ROWS = 5;
const OPEN_EVENT_STATUSES = ['OPEN', 'IN_REVIEW', 'REMEDIATING', 'MITIGATING'];
const SCHEDULER_ORIGIN = 'https://graph.keyforge.ai';

/** One line in a widget: title, a muted detail line and a badge on the right. */
interface PreviewRow { key: string; title: ReactNode; detail?: ReactNode; badge?: ReactNode }
interface Summary { count: number | null; rows: PreviewRow[] }

const isActive = (state?: string) => state === 'ACTIVE';
const countWhere = <T,>(rows: T[] | undefined, pred: (r: T) => boolean) => rows?.filter(pred).length;

// ---------- Fetches only the pages have (not exported from lib) ----------

/** Same request as the Scheduler page (SchedulerManager.fetchJobs): "group:job" strings. */
async function fetchSchedulerJobs(): Promise<Array<{ id: string; name: string; groupName: string }>> {
  const data = await assuranceRequest<string[] & { error?: string; message?: string }>(
    `${SCHEDULER_ORIGIN}/kfscheduler/api/v1/${encodeURIComponent(resolveTenantIdForHeader())}/jobs`,
  );
  if (data.error) throw new Error(data.message || data.error);
  return data.map((s) => {
    const [groupName, name] = s.includes(':') ? s.split(':') : ['Default', s];
    return { id: `${groupName}:${name}`, name, groupName };
  });
}

// ---------- Widget ----------

function Widget<T>({ title, subtitle, href, query, summarize }: {
  title: string;
  subtitle?: string;
  href: string;
  query: UseQueryResult<T>;
  summarize: (data: T) => Summary;
}) {
  const summary = query.data !== undefined ? summarize(query.data) : null;
  return (
    <section className={cx(CARD, 'flex flex-col min-w-0')}>
      <div className={CARD_HEADER}>
        <div className="min-w-0">
          <h2 className={CARD_TITLE}>{title}</h2>
          {subtitle && <p className={CARD_SUBTITLE}>{subtitle}</p>}
        </div>
        <span className="text-2xl font-bold text-gray-900 shrink-0">
          {query.isLoading ? <Spinner /> : summary?.count ?? '—'}
        </span>
      </div>

      <div className="flex-1 px-5 py-3">
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4"><Spinner /> Loading…</div>
        ) : query.error ? (
          <p className="text-sm text-red-600 py-4 break-words">
            {query.error instanceof Error ? query.error.message : 'Failed to load'}
          </p>
        ) : !summary?.rows.length ? (
          <p className="text-sm text-gray-500 py-4">Nothing to show.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {summary.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
              <li key={`${r.key}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 truncate">{r.title}</div>
                  {r.detail && <div className="text-xs text-gray-500 truncate">{r.detail}</div>}
                </div>
                {r.badge && <div className="shrink-0">{r.badge}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href={href} className="flex items-center gap-1 px-5 py-3 border-t border-gray-100 text-sm font-semibold text-blue-600 hover:text-blue-700">
        Open {title} <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h2>
      {/* Up to 3 per row; cards in a short last row grow to fill it, so no row leaves an empty gap. */}
      <div className="flex flex-wrap gap-4 *:grow *:basis-full md:*:basis-[45%] xl:*:basis-[30%]">{children}</div>
    </div>
  );
}

// ---------- Page ----------

export default function Home() {
  const { isAuthenticated } = useAuth();
  const enabled = isAuthenticated;

  const openEventsSearch = { status: OPEN_EVENT_STATUSES, page: 0, pageSize: PREVIEW_ROWS };
  const openEvents = useQuery({
    queryKey: ['continuouscompliance', 'events', 'search', openEventsSearch],
    queryFn: () => CcEvents.search(openEventsSearch),
    enabled,
  });
  const definitions = useQuery({
    queryKey: ['continuouscompliance', 'definitions', 'summary', {}],
    queryFn: () => CcDefinitionWrites.summary({}),
    enabled,
  });
  const controls = useQuery({
    queryKey: ['continuouscompliance', 'controls', 'list', {}],
    queryFn: () => Controls.list({}),
    enabled,
  });
  const reviewForms = useQuery({
    queryKey: ['continuouscompliance', 'review-forms'],
    queryFn: () => ReviewForms.fetchAll(),
    enabled,
  });
  const slaProfiles = useQuery({
    queryKey: ['continuouscompliance', 'sla-profiles', 'list', {}],
    queryFn: () => SlaProfiles.list({}),
    enabled,
  });
  const actions = useQuery({
    queryKey: ['continuouscompliance', 'action-types', 'list', {}],
    queryFn: () => Actions.list({}),
    enabled,
  });
  const executors = useQuery({
    queryKey: ['assurance', 'gov', 'executors'],
    queryFn: () => Executors.list(),
    enabled,
  });
  const templates = useQuery({
    queryKey: ['dashboard', 'email-templates'],
    queryFn: listEmailTemplates,
    enabled,
  });
  const jobs = useQuery({
    queryKey: ['dashboard', 'scheduler-jobs'],
    queryFn: fetchSchedulerJobs,
    enabled,
  });

  if (!isAuthenticated) {
    return null;
  }

  const controlRows = Array.isArray(controls.data) ? controls.data : undefined;
  const stat = (q: UseQueryResult<unknown>, value: number | undefined) => (q.isLoading ? '…' : value ?? '—');

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader title="Dashboard" subtitle="A summary of every Assurance Events page." />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <StatCard label="Open events" value={stat(openEvents, openEvents.data?.totalElements)} />
          <StatCard label="Active definitions" value={stat(definitions, countWhere(definitions.data, (d) => isActive(d.state)))} />
          <StatCard label="Active controls" value={stat(controls, countWhere(controlRows, (c) => isActive(c.state)))} />
          <StatCard label="SLA profiles" value={stat(slaProfiles, slaProfiles.data?.length)} />
          <StatCard label="Scheduled jobs" value={stat(jobs, jobs.data?.length)} />
        </div>

        <Section title="Events">
          <Widget
            title="All Events" subtitle="Open, in review, remediating or mitigating"
            href="/assurance-events/all-events" query={openEvents}
            summarize={(d) => ({
              count: d.totalElements,
              rows: d.content.map((e) => ({
                key: e.eventId,
                title: subjectLabel(e),
                detail: `${e.eventTypeCode} · ${e.status} · discovered ${formatRelative(e.discoveredAt)}`,
                badge: <SeverityBadge value={e.severity} />,
              })),
            })}
          />
          <Widget
            title="Event Definitions" href="/assurance-events/event-definitions" query={definitions}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((x) => ({
                key: x.definitionId,
                title: x.name,
                detail: `${x.code} v${x.version} · updated ${formatRelative(x.updatedAt)}`,
                badge: <StateBadge value={x.state} />,
              })),
            })}
          />
        </Section>

        <Section title="Library">
          <Widget
            title="Control Library" href="/assurance-events/control-library" query={controls}
            summarize={(d) => {
              const rows = Array.isArray(d) ? d : [];
              return {
                count: rows.length,
                rows: rows.map((c) => ({
                  key: c.controlId,
                  title: c.name,
                  detail: `${c.code} · ${c.categoryCode} · ${c.objectKind}`,
                  badge: <StateBadge value={c.state} />,
                })),
              };
            }}
          />
          <Widget
            title="Review Forms" href="/assurance-events/review-forms" query={reviewForms}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((f) => ({
                key: f.formId,
                title: f.title,
                detail: `${f.code} v${f.version}${f.system ? ' · system' : ''}`,
                badge: <StateBadge value={f.state} />,
              })),
            })}
          />
          <Widget
            title="SLA" subtitle="SLA profiles" href="/assurance-events/sla" query={slaProfiles}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((p) => ({
                key: p.profileId,
                title: p.name,
                detail: `${p.code} v${p.version} · ${humanDuration(p.duration)}`,
                badge: <StateBadge value={p.state} />,
              })),
            })}
          />
        </Section>

        <Section title="Configuration">
          <Widget
            title="Studio Configuration" subtitle="Action library" href="/assurance-events/studio-configuration" query={actions}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((a) => ({
                key: a.actionId,
                title: a.name,
                detail: `${a.code} · ${a.category}`,
                badge: <StateBadge value={a.state} />,
              })),
            })}
          />
          <Widget
            title="Executors" subtitle="Executor registry" href="/assurance-events/studio-configuration?tab=executors" query={executors}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((x) => ({
                key: x.executor_code,
                title: x.display_name,
                detail: `${x.executor_code} · ${x.kind}${x.paused ? ' · paused' : ''}`,
                badge: <StateBadge value={x.state} />,
              })),
            })}
          />
          <Widget
            title="Notifications" subtitle="Email templates" href="/assurance-events/notifications" query={templates}
            summarize={(d) => ({
              count: d.length,
              rows: d.map((t) => ({
                key: String(t.id),
                title: t.templateName,
                detail: t.templateType,
                badge: <StateBadge value={t.active ? 'ACTIVE' : 'INACTIVE'} />,
              })),
            })}
          />
        </Section>
      </div>
    </div>
  );
}
