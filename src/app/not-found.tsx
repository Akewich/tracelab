import Link from "next/link";
import { copy } from "@/i18n/th";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>{copy.errors.missing}</h1>
      <Link className="button-link" href="/">
        {copy.errors.home}
      </Link>
    </div>
  );
}
