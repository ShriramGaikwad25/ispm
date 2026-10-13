import { redirect } from "next/navigation";
import { EXECUTORS_LIST_HREF } from "@/lib/assurance-executors";

// Executors now live in Studio Configuration (Executors tab).
export default function ExecutorsPage() {
  redirect(EXECUTORS_LIST_HREF);
}
