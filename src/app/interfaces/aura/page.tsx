import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuraLanding } from "@/components/interfaces/aura/aura-landing";

export const metadata = {
  title: "Aura — Jorge Tovar",
  description: "Landing de un cliente de email AI-native, cinematográfico y con vidrio líquido.",
};

export default function AuraPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#0c0c0c]">
      <div className="relative z-20 mx-auto w-full max-w-[1400px] px-6 pt-8 sm:px-10">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <div className="mt-8 flex-1">
        <AuraLanding />
      </div>
    </div>
  );
}
