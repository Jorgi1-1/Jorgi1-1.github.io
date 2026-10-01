import type { Metadata } from "next";
import Link from "next/link";

import { StatusQull } from "@/components/qull/status-qull";
import "./status-page.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="status-page">
      <h1 className="status-mark" aria-label="404: page not found">
        <span aria-hidden="true">4</span>
        <StatusQull />
        <span aria-hidden="true">4</span>
      </h1>
      <p className="status-line">This page isn&apos;t on the sign.</p>
      <Link href="/" className="status-action">
        Back to the home page
      </Link>
    </main>
  );
}
