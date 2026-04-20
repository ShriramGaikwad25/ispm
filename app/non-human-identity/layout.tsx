import { NonHumanIdentitySidebar } from "@/components/non-human-identity/NonHumanIdentitySidebar";

export default function NonHumanIdentityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NonHumanIdentitySidebar />
      <div className="min-h-0 flex-1 overflow-auto bg-gray-50 p-6">{children}</div>
    </>
  );
}
