"use client";
import { Button } from "@/components/ui/button";
import { copy } from "@/i18n/th";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>{copy.errors.title}</h1>
      <p>{copy.errors.description}</p>
      <Button onClick={reset}>{copy.errors.retry}</Button>
    </div>
  );
}
