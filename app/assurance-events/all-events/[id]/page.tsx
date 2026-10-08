"use client";

import { useParams } from "next/navigation";
import { EventDetail } from "@/components/assurance-events/EventDetail";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EventDetail id={id} backHref="/assurance-events/all-events" backLabel="Back to all events" />;
}
