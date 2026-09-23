import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AxionPage } from "@/components/interfaces/axion/axion-page";

export const metadata = {
  title: "Axion Studio — Jorge Tovar",
  description: "Recreación de un landing de agencia de diseño con shaders WebGPU.",
};

export default function AxionRoute() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Below the pill navbar (which spans the full width at the same
          corner) rather than at the very top, where it overlapped it. */}
      <div className="absolute left-3 top-16 z-30 sm:left-5 sm:top-20">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <AxionPage />
    </div>
  );
}
