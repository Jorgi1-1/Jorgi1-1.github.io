import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VanguardHero } from "@/components/interfaces/vanguard/vanguard-hero";

export const metadata = {
  title: "VANGUARD — Jorge Tovar",
  description: "Recreación de un hero de agencia creativa con video de fondo.",
};

export default function VanguardPage() {
  return (
    <div className="relative flex flex-1 flex-col bg-background">
      {/* Sits below VANGUARD's own nav row (py-5/7 + logo line-height) rather
          than at the very top, where it would overlap the logo. */}
      <div className="absolute left-6 top-20 z-10 sm:left-10 sm:top-24 lg:top-28">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-md bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <VanguardHero />
    </div>
  );
}
