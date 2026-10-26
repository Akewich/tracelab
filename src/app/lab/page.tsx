import type { Metadata } from "next";
import { Lab } from "@/features/lab/components/lab";
export const metadata: Metadata = { title: "Observability Lab" };
export default function LabPage() {
  return <Lab />;
}
