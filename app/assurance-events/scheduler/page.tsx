import SchedulerManager from "@/components/scheduler/SchedulerManager";

// Assurance Events → Scheduler: the same scheduler as Settings → Gateway →
// Scheduler, on the graph.keyforge.ai scheduler API instead of preview.keyforge.ai.
export default function AssuranceSchedulerPage() {
  return (
    <div className="h-full">
      <SchedulerManager apiOrigin="https://graph.keyforge.ai" />
    </div>
  );
}
