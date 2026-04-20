"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { executeQuery } from "@/lib/api";
import { extractResultRows } from "@/lib/nhi-dashboard";

const TENANT_ID = "a0000000-0000-0000-0000-000000000001";

type Identity = {
  nhi_id: string;
  name: string;
  nhi_type: string;
  state?: string;
  risk_level?: string;
};

type EdgeRow = {
  lineage_id: string;
  relation: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  source_name: string;
  target_name: string;
};

type SideNode = {
  nhi_id: string;
  name: string;
  nhi_type: string;
  relation: string;
};

type LayoutNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  kind: "focal" | "in" | "out";
};

type LayoutEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
};

function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function LineageGraphPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [focalId, setFocalId] = useState("");
  const [focal, setFocal] = useState<Identity | null>(null);
  const [inbound, setInbound] = useState<SideNode[]>([]);
  const [outbound, setOutbound] = useState<SideNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = extractResultRows(
          await executeQuery<unknown>(
            `SELECT nhi_id, name, nhi_type
               FROM public.kf_nhi_identity
              WHERE tenant_id = ?::uuid
              ORDER BY name LIMIT 500`,
            [TENANT_ID]
          )
        );
        const parsed = rows.map((r) => ({
          nhi_id: asText(r.nhi_id),
          name: asText(r.name),
          nhi_type: asText(r.nhi_type),
        }));
        setIdentities(parsed);
        if (parsed.length && !focalId) setFocalId(parsed[0].nhi_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load identities");
      } finally {
        setLoading(false);
      }
    })();
  }, [focalId]);

  const loadLineage = useCallback(async () => {
    if (!focalId) return;
    setLoading(true);
    setError(null);
    try {
      const edgeSql = `
        SELECT l.lineage_id, l.relation,
               l.source_type, l.source_id,
               l.target_type, l.target_id,
               COALESCE(
                 (SELECT name         FROM public.kf_nhi_identity       WHERE nhi_id      = l.source_id AND tenant_id = l.tenant_id),
                 (SELECT username     FROM public.usr                   WHERE userid      = l.source_id),
                 (SELECT instancename FROM public.applicationinstance   WHERE instanceid  = l.source_id),
                 l.source_type || ':' || substr(l.source_id::text, 1, 8)
               ) AS source_name,
               COALESCE(
                 (SELECT name         FROM public.kf_nhi_identity       WHERE nhi_id      = l.target_id AND tenant_id = l.tenant_id),
                 (SELECT username     FROM public.usr                   WHERE userid      = l.target_id),
                 (SELECT instancename FROM public.applicationinstance   WHERE instanceid  = l.target_id),
                 l.target_type || ':' || substr(l.target_id::text, 1, 8)
               ) AS target_name
          FROM public.kf_nhi_lineage l
         WHERE l.tenant_id = ?::uuid
           AND (l.source_id = ?::uuid OR l.target_id = ?::uuid)
         LIMIT 60`;

      const [focalRows, edgeRowsRaw] = await Promise.all([
        extractResultRows(
          await executeQuery<unknown>(
            `SELECT nhi_id, name, nhi_type, state, risk_level
               FROM public.kf_nhi_identity
              WHERE tenant_id = ?::uuid AND nhi_id = ?::uuid`,
            [TENANT_ID, focalId]
          )
        ),
        extractResultRows(await executeQuery<unknown>(edgeSql, [TENANT_ID, focalId, focalId])),
      ]);

      setFocal(
        focalRows[0]
          ? {
              nhi_id: asText(focalRows[0].nhi_id),
              name: asText(focalRows[0].name),
              nhi_type: asText(focalRows[0].nhi_type),
              state: asText(focalRows[0].state),
              risk_level: asText(focalRows[0].risk_level),
            }
          : null
      );

      const edgeRows: EdgeRow[] = edgeRowsRaw.map((e) => ({
        lineage_id: asText(e.lineage_id),
        relation: asText(e.relation),
        source_type: asText(e.source_type),
        source_id: asText(e.source_id),
        target_type: asText(e.target_type),
        target_id: asText(e.target_id),
        source_name: asText(e.source_name),
        target_name: asText(e.target_name),
      }));

      const inb: SideNode[] = [];
      const outb: SideNode[] = [];
      for (const e of edgeRows) {
        if (e.target_id === focalId) {
          inb.push({
            nhi_id: e.source_id,
            name: e.source_name,
            nhi_type: e.source_type,
            relation: e.relation,
          });
        } else {
          outb.push({
            nhi_id: e.target_id,
            name: e.target_name,
            nhi_type: e.target_type,
            relation: e.relation,
          });
        }
      }
      setInbound(inb);
      setOutbound(outb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lineage");
    } finally {
      setLoading(false);
    }
  }, [focalId]);

  useEffect(() => {
    void loadLineage();
  }, [loadLineage]);

  const layout = useMemo(() => buildLayout(inbound, focal, outbound), [inbound, focal, outbound]);

  return (
    <div className="w-full space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Lineage Graph</h1>
        <div className="flex items-center gap-2">
          <select
            className="min-w-[300px] rounded border border-slate-300 px-3 py-1.5 text-sm"
            value={focalId}
            onChange={(e) => setFocalId(e.target.value)}
          >
            {identities.map((i) => (
              <option key={i.nhi_id} value={i.nhi_id}>
                {i.name} — {i.nhi_type}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => void loadLineage()}
            title="Refresh"
            aria-label="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && !focal && <div className="text-sm text-slate-500">Loading lineage…</div>}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm text-slate-700">
          {focal ? (
            <>
              Focal: <b>{focal.name}</b> · {focal.nhi_type} · state={focal.state || "—"} · risk={focal.risk_level || "—"}
              <span className="ml-3 text-xs text-slate-500">
                inbound={inbound.length} · outbound={outbound.length}
              </span>
            </>
          ) : (
            "No focal NHI"
          )}
        </div>

        <div className="overflow-x-auto rounded border border-slate-200 bg-slate-50">
          <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-[520px] w-full">
            {layout.edges.map((e, i) => (
              <g key={`e-${i}`}>
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#94a3b8" strokeWidth={1.5} />
                {e.label && (
                  <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 6} textAnchor="middle" fontSize={10} fill="#64748b">
                    {e.label}
                  </text>
                )}
              </g>
            ))}

            {layout.nodes.map((n) => (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                <rect
                  x={-110}
                  y={-20}
                  width={220}
                  height={40}
                  rx={10}
                  ry={10}
                  fill={n.kind === "focal" ? "#dbeafe" : n.kind === "in" ? "#ecfeff" : "#f5f3ff"}
                  stroke={n.kind === "focal" ? "#60a5fa" : n.kind === "in" ? "#67e8f9" : "#c4b5fd"}
                />
                <text x={0} y={-2} textAnchor="middle" fontSize={12} fontWeight={600} fill="#0f172a">
                  {n.label}
                </text>
                <text x={0} y={14} textAnchor="middle" fontSize={10} fill="#475569">
                  {n.sub}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>
    </div>
  );
}

function buildLayout(inbound: SideNode[], focal: Identity | null, outbound: SideNode[]) {
  const colX = { in: 160, focal: 520, out: 880 };
  const width = 1040;
  const rowH = 70;
  const topPad = 50;

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  if (focal) {
    const cy = topPad + (Math.max(inbound.length, outbound.length, 1) * rowH) / 2;
    nodes.push({
      id: focal.nhi_id,
      x: colX.focal,
      y: cy,
      label: focal.name,
      sub: focal.nhi_type,
      kind: "focal",
    });

    inbound.forEach((n, idx) => {
      const y = topPad + idx * rowH + rowH / 2;
      nodes.push({ id: `in-${n.nhi_id}-${idx}`, x: colX.in, y, label: n.name, sub: n.nhi_type, kind: "in" });
      edges.push({ x1: colX.in + 110, y1: y, x2: colX.focal - 110, y2: cy, label: n.relation });
    });

    outbound.forEach((n, idx) => {
      const y = topPad + idx * rowH + rowH / 2;
      nodes.push({ id: `out-${n.nhi_id}-${idx}`, x: colX.out, y, label: n.name, sub: n.nhi_type, kind: "out" });
      edges.push({ x1: colX.focal + 110, y1: cy, x2: colX.out - 110, y2: y, label: n.relation });
    });
  }

  const height = Math.max(topPad * 2 + Math.max(inbound.length, outbound.length, 1) * rowH, 220);
  return { width, height, nodes, edges };
}

