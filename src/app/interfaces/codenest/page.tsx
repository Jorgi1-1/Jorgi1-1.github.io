import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CodeNestHero } from "@/components/interfaces/codenest/codenest-hero";

export const metadata = {
  title: "CodeNest — Jorge Tovar",
  description:
    "Recreación de un hero dark de plataforma educativa con video HLS y tarjeta de cristal líquido.",
};

export default function CodeNestPage() {
  return (
    <div className="relative flex flex-1 flex-col bg-background">
      <div className="absolute right-6 top-20 z-40 sm:right-10 sm:top-24 lg:top-28">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-md bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <CodeNestHero />
    </div>
  );
}
