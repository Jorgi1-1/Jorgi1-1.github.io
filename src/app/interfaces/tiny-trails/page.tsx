import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TinyTrails404 } from "@/components/interfaces/tiny-trails/tiny-trails-404";

export const metadata = {
  title: "404 - Page Not Found",
  description: "Recreación de una página 404 animada para una marca infantil.",
};

export default function TinyTrailsRoute() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Below TinyTrails' own nav row, which occupies the same corner. */}
      <div className="absolute left-3 top-16 z-40 sm:left-5 sm:top-20">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <TinyTrails404 />
    </div>
  );
}
