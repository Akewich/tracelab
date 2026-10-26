"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy } from "@/i18n/th";
export function Retry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RotateCw size={15} className={pending ? "animate-spin" : ""} />
      {copy.orders.retry}
    </Button>
  );
}
