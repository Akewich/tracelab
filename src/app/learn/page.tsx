import type { Metadata } from "next";
import { Learn } from "@/features/learn/components/learn";
export const metadata: Metadata = { title: "Learn OpenTelemetry" };
export default function LearnPage() {
  return <Learn />;
}
