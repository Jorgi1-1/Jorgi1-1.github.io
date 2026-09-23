import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CropwisePage } from "@/components/interfaces/cropwise/cropwise-page";

export const metadata = {
  title: "Cropwise — Jorge Tovar",
  description:
    "Recreación de un landing page agrícola de una sola página con Lenis, GSAP ScrollTrigger/SplitText y Splide.",
};

export default function CropwiseRoutePage() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Portfolio chrome, not part of the recreation: floated bottom-left so
          it never collides with the site's own fixed MENU/logo/CONTACTO bar. */}
      {/* Icon-only on phones (bottom-right) so it clears the hero CTA, full
          pill on wider screens where the bottom-left corner is empty. */}
      <div className="fixed bottom-5 right-5 z-30 sm:left-5 sm:right-auto">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-full border border-[#eae6d9]/25 bg-[#1a2413]/80 p-2.5 text-xs font-medium text-[#eae6d9] backdrop-blur-md transition-colors hover:bg-[#1a2413] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eae6d9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2413] sm:px-4 sm:py-2"
        >
          <ArrowLeft className="size-3.5" />
          <span className="max-sm:sr-only">Volver a interfaces</span>
        </Link>
      </div>

      <CropwisePage />
    </div>
  );
}
