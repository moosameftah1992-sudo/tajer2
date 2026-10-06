import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="lock">
      <article>
        <Wordmark />
        <h1>404</h1>
        <p>This Tajer link is not on the map. / هذا الرابط غير موجود.</p>
        <Link className="btn btn-emerald" href="/">Home</Link>
      </article>
    </main>
  );
}
