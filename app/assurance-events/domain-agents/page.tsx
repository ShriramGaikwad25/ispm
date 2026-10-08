import { PAGE, PAGE_INNER, PageHeader } from "@/components/assurance-events/ui";

export default function Page() {
  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader title="Domain Agents" />
      </div>
    </div>
  );
}
