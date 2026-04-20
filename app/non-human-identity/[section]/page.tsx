import { notFound } from "next/navigation";
import { NHI_NAV_ITEMS, NHI_SECTION_SLUGS } from "@/lib/nhi-shell";
import { NhiInventoryPage } from "@/components/non-human-identity/NhiInventoryPage";
import { ServiceAccountsPage } from "@/components/non-human-identity/ServiceAccountsPage";
import { RfcCallsPage } from "@/components/non-human-identity/RfcCallsPage";
import { FindingsPage } from "@/components/non-human-identity/FindingsPage";
import { SodViolationsPage } from "@/components/non-human-identity/SodViolationsPage";
import { ChangesPage } from "@/components/non-human-identity/ChangesPage";
import { ReviewsPage } from "@/components/non-human-identity/ReviewsPage";
import { ControlRunsPage } from "@/components/non-human-identity/ControlRunsPage";
import { EmergencyUsagePage } from "@/components/non-human-identity/EmergencyUsagePage";
import { LookupCatalogPage } from "@/components/non-human-identity/LookupCatalogPage";
import { LineageGraphPage } from "@/components/non-human-identity/LineageGraphPage";

type PageProps = { params: Promise<{ section: string }> };

export default async function NonHumanIdentitySectionPage({ params }: PageProps) {
  const { section } = await params;
  if (!NHI_SECTION_SLUGS.has(section)) {
    notFound();
  }

  const label =
    NHI_NAV_ITEMS.find((i) => i.href === `/non-human-identity/${section}`)?.label ??
    section;

  if (section === "nhis") {
    return <NhiInventoryPage />;
  }
  if (section === "service-accounts") {
    return <ServiceAccountsPage />;
  }
  if (section === "rfc-calls") {
    return <RfcCallsPage />;
  }
  if (section === "findings") {
    return <FindingsPage />;
  }
  if (section === "sod") {
    return <SodViolationsPage />;
  }
  if (section === "changes") {
    return <ChangesPage />;
  }
  if (section === "reviews") {
    return <ReviewsPage />;
  }
  if (section === "controls") {
    return <ControlRunsPage />;
  }
  if (section === "emergency") {
    return <EmergencyUsagePage />;
  }
  if (section === "lookups") {
    return <LookupCatalogPage />;
  }
  if (section === "lineage") {
    return <LineageGraphPage />;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900">{label}</h1>
      <p className="mt-2 text-sm text-gray-600">Content for this section will go here.</p>
    </div>
  );
}
