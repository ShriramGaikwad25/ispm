// React Query hooks for the Assurance Events pages — ported from the
// Continuous Assurance app's hooks/useEvents.ts, useWorkflows.ts and
// useLookups.ts. Keys are prefixed with "assurance" so they never collide
// with ISPM's own queries.

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Definitions, Events, Governance, Lookups, Workflows, WorkItems } from "@/lib/assurance-events-api";
import type {
  DecisionRequest, DefinitionCreateRequest, EventDefinition, EventQuery, Lookup, UUID,
} from "@/lib/assurance-events-api";

const EVENTS_KEY = ["assurance", "events"] as const;
const LOOKUP_KEY = ["assurance", "lookup"] as const;
const WF_KEY = ["assurance", "workflows"] as const;
const WI_KEY = ["assurance", "work-items"] as const;

// ---------- Lookups

/** Reads an active lookup domain, cached per (domain, locale). */
export function useLookup(domain: string, locale = "en-US") {
  return useQuery({
    queryKey: [...LOOKUP_KEY, domain, locale],
    queryFn: () => Lookups.list(domain, locale),
    staleTime: 5 * 60_000,
  });
}

/** Map of code -> Lookup for fast metadata lookups (color, rules, etc.). */
export function useLookupMap(domain: string, locale = "en-US") {
  const q = useLookup(domain, locale);
  const map = useMemo(() => {
    const m = new Map<string, Lookup>();
    (q.data ?? []).forEach((l) => m.set(l.code, l));
    return m;
  }, [q.data]);
  return { map, ...q };
}

// ---------- Events

export function useEventList(query: EventQuery) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "list", query],
    queryFn: () => Events.list(query),
  });
}

export function useEvent(id: UUID | undefined) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "detail", id],
    queryFn: () => Events.get(id!),
    enabled: !!id,
  });
}

export function useEventDecisions(id: UUID | undefined) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "decisions", id],
    queryFn: () => Events.decisions(id!),
    enabled: !!id,
  });
}

export function useEventMitigations(id: UUID | undefined) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "mitigations", id],
    queryFn: () => Events.mitigations(id!),
    enabled: !!id,
  });
}

export function useEventRemediations(id: UUID | undefined) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "remediations", id],
    queryFn: () => Events.remediations(id!),
    enabled: !!id,
  });
}

export function useAiInsight(id: UUID | undefined) {
  return useQuery({
    queryKey: [...EVENTS_KEY, "insight", id],
    queryFn: () => Events.insight(id!),
    enabled: !!id,
  });
}

export function useRefreshInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => Events.refreshInsight(id),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: [...EVENTS_KEY, "insight", id] }),
  });
}

/** Decisions change status, history, mitigations and remediations — refresh all event queries. */
export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: UUID; body: DecisionRequest }) => Events.decide(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useReopenEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: UUID; reason?: string }) => Events.reopen(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useSuppressEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, until }: { id: UUID; reason?: string; until?: string }) =>
      Events.suppress(id, reason, until),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

// ---------- Definitions

const DEFINITIONS_KEY = ["assurance", "definitions"] as const;

export function useDefinitionList() {
  return useQuery({ queryKey: DEFINITIONS_KEY, queryFn: () => Definitions.list() });
}

export function useActivateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => Definitions.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEFINITIONS_KEY }),
  });
}

export function useCreateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: DefinitionCreateRequest) => Definitions.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEFINITIONS_KEY }),
  });
}

export function useNewDefinitionVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => Definitions.newVersion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEFINITIONS_KEY }),
  });
}

export function useDeprecateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => Definitions.deprecate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEFINITIONS_KEY }),
  });
}

export function useDefinition(id: UUID | undefined) {
  return useQuery({
    queryKey: ["assurance", "definition", id],
    queryFn: () => Definitions.get(id!),
    enabled: !!id,
  });
}

// ---------- Definition editor (deployed console's /definitions/:id)

const GOV_KEY = ["assurance", "gov"] as const;

/** After any editor write: the list, every loaded definition and the governance reads. */
export function useInvalidateGovernance() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: DEFINITIONS_KEY });
    qc.invalidateQueries({ queryKey: ["assurance", "definition"] });
    qc.invalidateQueries({ queryKey: GOV_KEY });
  };
}

export function useDefinitionUsage(id: UUID) {
  return useQuery({ queryKey: [...GOV_KEY, "usage", id], queryFn: () => Definitions.usage(id) });
}

/** Validates the draft as edited — re-runs whenever the edited definition changes. */
export function useDefinitionValidation(id: UUID, dto: EventDefinition) {
  return useQuery({
    queryKey: [...GOV_KEY, "validate", id, JSON.stringify(dto)],
    queryFn: () => Definitions.validate(id, dto),
  });
}

export function useEffectiveConfig(id: UUID) {
  return useQuery({ queryKey: [...GOV_KEY, "effective", id], queryFn: () => Definitions.effectiveConfig(id) });
}

export function useExecutors() {
  return useQuery({ queryKey: [...GOV_KEY, "executors"], queryFn: () => Governance.executors() });
}

export function useMitigationControls() {
  return useQuery({ queryKey: [...GOV_KEY, "mitigations"], queryFn: () => Governance.mitigations() });
}

export function useKillswitch() {
  return useQuery({ queryKey: [...GOV_KEY, "killswitch"], queryFn: () => Governance.killswitch() });
}

export function useNotifications() {
  return useQuery({ queryKey: [...GOV_KEY, "notifications"], queryFn: () => Governance.notifications() });
}

// ---------- Workflows and work items

export function useWorkflowList() {
  return useQuery({ queryKey: WF_KEY, queryFn: () => Workflows.list() });
}

export function useStartWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eventId }: { id: UUID; eventId: UUID }) => Workflows.start(id, eventId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [...WF_KEY, "instances", v.eventId] });
      qc.invalidateQueries({ queryKey: WI_KEY });
    },
  });
}

export function useEventWorkflowInstances(eventId: UUID | undefined) {
  return useQuery({
    queryKey: [...WF_KEY, "instances", eventId],
    queryFn: () => Workflows.instancesByEvent(eventId!),
    enabled: !!eventId,
  });
}

export function useInstanceDetail(instanceId: UUID | undefined) {
  return useQuery({
    queryKey: [...WF_KEY, "instance", instanceId],
    queryFn: () => Workflows.instanceDetail(instanceId!),
    enabled: !!instanceId,
  });
}

export function useMyWorkItems() {
  return useQuery({ queryKey: WI_KEY, queryFn: () => WorkItems.mine(true) });
}

export function useDecideWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome, comment }: { id: UUID; outcome: "APPROVED" | "REJECTED"; comment?: string }) =>
      WorkItems.decide(id, outcome, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WI_KEY });
      qc.invalidateQueries({ queryKey: WF_KEY });
    },
  });
}
