import { EventsListPage } from "@/components/assurance-events/EventsListPage";

// Same as the Continuous Assurance app's /inbox: events awaiting a decision.
const DEFAULT_STATUSES = ["OPEN", "IN_REVIEW"];

export default function Page() {
  return (
    <EventsListPage
      title="Reviewer Inbox"
      subtitle="Events assigned to you, awaiting decision."
      defaultStatuses={DEFAULT_STATUSES}
    />
  );
}
