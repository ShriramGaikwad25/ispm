"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Check, Pencil, Trash2 } from "lucide-react";
import ClientOnlyAgGrid from "@/components/ClientOnlyAgGrid";
import "@/lib/ag-grid-setup";

const VARIABLES_FETCH_URL = "/api/celmodule/variables";

type CelModuleVariable = {
  id: number;
  name: string;
  type: string;
  category: string;
  description: string;
  createdAt: string;
};

type ValidationRow = {
  id: string;
  name: string;
  cel: string;
  create: boolean;
  update: boolean;
};

const SEED_VALIDATIONS: ValidationRow[] = [
  { id: "email-uniqueness", name: "Email Uniqueness", cel: "", create: true, update: true },
  { id: "upn", name: "UPN", cel: "", create: true, update: true },
  { id: "samaccountname", name: "SAMAccount Name", cel: "", create: true, update: true },
];

let validationIdCounter = 0;
function nextValidationId(): string {
  validationIdCounter += 1;
  return `validation-${validationIdCounter}`;
}

function notifySaved(message: string) {
  const toast = (window as unknown as { toast?: (msg: string) => void }).toast;
  if (typeof toast === "function") toast(message);
}

export default function ValidationsPanel() {
  const [validations, setValidations] = useState<ValidationRow[]>(SEED_VALIDATIONS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [catalogVariables, setCatalogVariables] = useState<CelModuleVariable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(true);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [variableFilter, setVariableFilter] = useState("");
  const [celDragOver, setCelDragOver] = useState(false);

  const activeCelInputRef = useRef<HTMLInputElement | null>(null);
  const activeCelCursorRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setVariablesLoading(true);
      setVariablesError(null);
      try {
        const res = await fetch(VARIABLES_FETCH_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid variables response");
        setCatalogVariables(data as CelModuleVariable[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setVariablesError(err instanceof Error ? err.message : "Failed to load variables");
        setCatalogVariables([]);
      } finally {
        setVariablesLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filteredCatalogVariables = useMemo(() => {
    const term = variableFilter.trim().toLowerCase();
    if (!term) return catalogVariables;
    return catalogVariables.filter(
      (v) => v.name.toLowerCase().includes(term) || v.category.toLowerCase().includes(term)
    );
  }, [catalogVariables, variableFilter]);

  const updateValidation = useCallback(
    <K extends keyof ValidationRow>(id: string, field: K, value: ValidationRow[K]) => {
      setValidations((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    },
    []
  );

  const insertIntoActiveCel = useCallback(
    (insert: string) => {
      if (!editingId) return;
      setValidations((prev) =>
        prev.map((v) => {
          if (v.id !== editingId) return v;
          const len = v.cel.length;
          const pos = Math.max(0, Math.min(activeCelCursorRef.current, len));
          const next = v.cel.slice(0, pos) + insert + v.cel.slice(pos);
          const caret = pos + insert.length;
          requestAnimationFrame(() => {
            const el = activeCelInputRef.current;
            if (el) {
              el.focus();
              el.setSelectionRange(caret, caret);
              activeCelCursorRef.current = caret;
            }
          });
          return { ...v, cel: next };
        })
      );
    },
    [editingId]
  );

  const handleVariableDragStart = useCallback((e: DragEvent<HTMLButtonElement>, name: string) => {
    e.dataTransfer.setData("text/plain", name);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleCelDrop = useCallback(
    (e: DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      setCelDragOver(false);
      const insert = e.dataTransfer.getData("text/plain").trim();
      if (!insert) return;
      const el = e.currentTarget;
      activeCelCursorRef.current = el.selectionStart ?? el.value.length;
      insertIntoActiveCel(insert);
    },
    [insertIntoActiveCel]
  );

  const startEdit = useCallback((id: string) => {
    setVariableFilter("");
    setEditingId(id);
  }, []);

  const stopEdit = useCallback((id: string) => {
    setEditingId((current) => (current === id ? null : current));
    notifySaved("Validation saved");
  }, []);

  const addValidation = useCallback(() => {
    const id = nextValidationId();
    setValidations((prev) => [...prev, { id, name: "", cel: "", create: false, update: false }]);
    startEdit(id);
  }, [startEdit]);

  const removeValidation = useCallback(
    (id: string) => {
      setValidations((prev) => prev.filter((v) => v.id !== id));
      setEditingId((current) => (current === id ? null : current));
    },
    []
  );

  const columnDefs = useMemo<ColDef<ValidationRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Validation Name",
        flex: 1.2,
        minWidth: 180,
        wrapText: true,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams<ValidationRow>) => {
          const row = p.data;
          if (!row) return null;
          if (row.id !== editingId) {
            return <div className="py-1.5 font-medium text-gray-900">{row.name || "—"}</div>;
          }
          return (
            <input
              autoFocus
              value={row.name}
              onChange={(e) => updateValidation(row.id, "name", e.target.value)}
              placeholder="e.g. Email Uniqueness"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          );
        },
      },
      {
        headerName: "CEL Expression",
        flex: 1.6,
        minWidth: 220,
        wrapText: true,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams<ValidationRow>) => {
          const row = p.data;
          if (!row) return null;
          if (row.id !== editingId) {
            return row.cel ? (
              <div className="py-1.5 font-mono text-[11px] text-gray-700 break-all">{row.cel}</div>
            ) : (
              <div className="py-1.5 text-sm text-gray-400">No expression set</div>
            );
          }
          return (
            <input
              ref={(el) => {
                activeCelInputRef.current = el;
              }}
              value={row.cel}
              onChange={(e) => {
                activeCelCursorRef.current = e.target.selectionStart ?? e.target.value.length;
                updateValidation(row.id, "cel", e.target.value);
              }}
              onSelect={(e) => {
                activeCelCursorRef.current = e.currentTarget.selectionStart ?? 0;
              }}
              onKeyUp={(e) => {
                activeCelCursorRef.current = e.currentTarget.selectionStart ?? 0;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setCelDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setCelDragOver(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setCelDragOver(false);
              }}
              onDrop={handleCelDrop}
              placeholder="Enter CEL expression, or drag a variable from the sidebar"
              className="w-full rounded-md border px-2 py-1.5 font-mono text-[11px] focus:outline-none"
              style={
                celDragOver
                  ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px var(--accent-soft)" }
                  : { borderColor: "#d1d5db" }
              }
            />
          );
        },
      },
      {
        headerName: "Scope",
        width: 180,
        minWidth: 160,
        wrapText: true,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams<ValidationRow>) => {
          const row = p.data;
          if (!row) return null;
          if (row.id !== editingId) {
            const parts = [row.create ? "Create" : null, row.update ? "Update" : null].filter(
              Boolean
            ) as string[];
            if (!parts.length) return <span className="text-sm text-gray-400">No scope</span>;
            return (
              <div className="flex flex-wrap gap-1.5 py-2">
                {parts.map((part) => (
                  <span
                    key={part}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600"
                  >
                    {part}
                  </span>
                ))}
              </div>
            );
          }
          return (
            <div className="flex items-center gap-3 py-2 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.create}
                  onChange={(e) => updateValidation(row.id, "create", e.target.checked)}
                />
                Create
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.update}
                  onChange={(e) => updateValidation(row.id, "update", e.target.checked)}
                />
                Update
              </label>
            </div>
          );
        },
      },
      {
        colId: "actions",
        headerName: "",
        width: 90,
        minWidth: 84,
        maxWidth: 96,
        sortable: false,
        suppressSizeToFit: true,
        cellRenderer: (p: ICellRendererParams<ValidationRow>) => {
          const row = p.data;
          if (!row) return null;
          const editing = row.id === editingId;
          return (
            <div className="flex items-center justify-center gap-1 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (editing) stopEdit(row.id);
                  else startEdit(row.id);
                }}
                className={`inline-flex rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  editing
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                }`}
                title={editing ? "Save validation" : "Edit validation"}
                aria-label={editing ? "Save validation" : "Edit validation"}
              >
                {editing ? <Check className="h-4 w-4 shrink-0" /> : <Pencil className="h-4 w-4 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeValidation(row.id);
                }}
                className="inline-flex rounded-md p-2 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Delete validation"
                aria-label="Delete validation"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
              </button>
            </div>
          );
        },
      },
    ],
    [editingId, removeValidation, startEdit, stopEdit, updateValidation, handleCelDrop, celDragOver]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: false,
      resizable: true,
      filter: false,
      floatingFilter: false,
      wrapText: true,
      autoHeight: true,
    }),
    []
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Validations</h2>
        </div>
        <div className="actions">
          <button type="button" className="btn primary" onClick={addValidation}>
            Add Validation
          </button>
        </div>
      </div>

      <div className="section card section-card">
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }} className="ag-theme-alpine w-full">
            <ClientOnlyAgGrid
              rowData={validations}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              getRowId={(p: { data: ValidationRow }) => p.data.id}
            />
          </div>

          {editingId && (
            <div
              style={{
                width: 220,
                flexShrink: 0,
                borderLeft: "1px solid var(--line)",
                paddingLeft: 16,
                display: "flex",
                flexDirection: "column",
                maxHeight: 420,
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 700, color: "#465063", marginBottom: 6 }}>
                Variables
              </label>
              <input
                value={variableFilter}
                onChange={(e) => setVariableFilter(e.target.value)}
                placeholder="Search variables"
                style={{
                  width: "100%",
                  marginBottom: 8,
                  border: "1px solid var(--line)",
                  borderRadius: 7,
                  padding: "6px 8px",
                  fontSize: 11,
                }}
              />
              <p style={{ fontSize: 10, color: "var(--muted)", margin: "0 0 8px" }}>
                Drag onto the expression, or click to insert.
              </p>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {variablesLoading && (
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>Loading variables…</p>
                )}
                {variablesError && !variablesLoading && (
                  <p style={{ fontSize: 11, color: "var(--danger)" }}>{variablesError}</p>
                )}
                {!variablesLoading && !variablesError && filteredCatalogVariables.length === 0 && (
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>No variables found.</p>
                )}
                {!variablesLoading &&
                  !variablesError &&
                  filteredCatalogVariables.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleVariableDragStart(e, v.name)}
                      onClick={() => insertIntoActiveCel(v.name)}
                      title={v.description}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: "1px solid transparent",
                        borderRadius: 7,
                        padding: "6px 7px",
                        cursor: "grab",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--panel-2)";
                        e.currentTarget.style.borderColor = "var(--line)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 11,
                          color: "var(--text)",
                          wordBreak: "break-all",
                        }}
                      >
                        {v.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{v.category}</div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
