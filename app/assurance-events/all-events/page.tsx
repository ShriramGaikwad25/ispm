import { EventsListPage } from "@/components/assurance-events/EventsListPage";

// The Continuous Assurance sidebar opens All Events on the in-flight statuses.
const DEFAULT_STATUSES = ["OPEN", "IN_REVIEW", "DECIDED", "MITIGATING", "REMEDIATING"];

export default function Page() {
  return (
    <EventsListPage
      title="All Events"
      subtitle="Every event in the tenant — filter, sort, drill in."
      defaultStatuses={DEFAULT_STATUSES}
    />
  );
}
