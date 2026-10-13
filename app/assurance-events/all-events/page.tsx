"use client";

import { EventsListPage } from "@/components/assurance-events/EventsListPage";
import { CcEvents } from "@/lib/cc-events-api";

// The Continuous Compliance Console's Events page (graph.keyforge.ai/console#/events)
// opens on the in-flight statuses; same default here.
const DEFAULT_STATUSES = ["OPEN", "IN_REVIEW", "REMEDIATING", "MITIGATING"];

export default function Page() {
  return (
    <EventsListPage
      title="All Events"
      subtitle="Every event in the tenant — filter, sort, drill in."
      defaultStatuses={DEFAULT_STATUSES}
      fetchEvents={CcEvents.list}
    />
  );
}
