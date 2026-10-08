"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { DefinitionEditor } from "@/components/assurance-events/definition-editor/DefinitionEditor";
import { PageSpinner } from "@/components/assurance-events/ui";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <Suspense fallback={<PageSpinner />}>
      <DefinitionEditor key={id} id={id} />
    </Suspense>
  );
}
